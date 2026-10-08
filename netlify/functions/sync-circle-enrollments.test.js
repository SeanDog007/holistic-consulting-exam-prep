const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

process.env.SYNC_SECRET = "test-secret";
process.env.CIRCLE_API_TOKEN = "test-token";

const {
  handler,
  run,
  emailFromRosterRecord,
  resolveEntitled,
  MAX_CALLS_PER_RUN,
  MIN_PLAUSIBLE_ROSTER,
} = require("./sync-circle-enrollments");

function member(id, email, name) {
  const community_member = { name: name || "Member" };
  if (email) community_member.email = email;
  return { community_member_id: id, community_member };
}

function pad(records) {
  const out = records.slice();
  let n = 1;
  while (out.length < MIN_PLAUSIBLE_ROSTER) {
    out.push(member(9000 + n, `pad${n}@example.com`, `Pad ${n}`));
    n += 1;
  }
  return out;
}

function circlePages(pages) {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    const page = Number(new URLSearchParams(path.split("?")[1] || "").get("page") || "1");
    const records = pages[page - 1];
    if (!records) throw new Error(`unexpected ${path}`);
    return { records, has_next_page: page < pages.length };
  };
  return { calls, request };
}

function memoryDb(rows) {
  const updates = [];
  return {
    updates,
    from() {
      return {
        select() {
          return { limit: async () => ({ data: rows, error: null }) };
        },
        update(patch) {
          return {
            eq(_col, id) {
              updates.push({ id, patch });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
}

describe("emailFromRosterRecord", () => {
  test("reads the nested space-member email and normalizes it", () => {
    const parsed = emailFromRosterRecord({
      community_member_id: 42,
      community_member: { email: "  Ada@Example.com ", name: "Ada" },
    });
    assert.deepEqual(parsed, { id: "42", email: "ada@example.com", name: "Ada" });
  });

  test("treats a missing nested email as unresolved id", () => {
    const parsed = emailFromRosterRecord({ community_member_id: 7, community_member: { name: "No Mail" } });
    assert.equal(parsed.email, "");
    assert.equal(parsed.id, "7");
  });
});

describe("resolveEntitled", () => {
  test("does not look anyone up when the roster already has emails", async () => {
    let lookups = 0;
    const { entitled, unresolved, directLookups } = await resolveEntitled(
      [member(1, "a@example.com", "A"), member(2, "b@example.com", "B")],
      async () => { lookups += 1; return {}; },
      { callsAlready: 1 }
    );
    assert.equal(lookups, 0);
    assert.equal(directLookups, 0);
    assert.deepEqual(unresolved, []);
    assert.equal(entitled.get("a@example.com"), "A");
  });

  test("looks up only roster records that have no email, within the per-run cap", async () => {
    const lookedUp = [];
    const roster = [member(1, "a@example.com", "A"), member(2, null, "Missing")];
    const { entitled, unresolved, directLookups } = await resolveEntitled(
      roster,
      async (id) => {
        lookedUp.push(id);
        return { email: "missing@example.com", name: "Missing" };
      },
      { callsAlready: 1 }
    );
    assert.deepEqual(lookedUp, ["2"]);
    assert.equal(directLookups, 1);
    assert.deepEqual(unresolved, []);
    assert.equal(entitled.get("missing@example.com"), "Missing");
  });

  test("refuses to fan out when missing emails would exceed the call cap", async () => {
    const missing = Array.from({ length: MAX_CALLS_PER_RUN }, (_, i) => member(i + 1, null));
    let lookups = 0;
    const { unresolved, directLookups } = await resolveEntitled(
      missing,
      async () => { lookups += 1; return { email: "x@example.com" }; },
      { callsAlready: 1 }
    );
    assert.equal(lookups, 0);
    assert.equal(directLookups, 0);
    assert.equal(unresolved.length, MAX_CALLS_PER_RUN);
  });
});

describe("run", () => {
  test("one roster page and no community-member crawl when emails are present", async () => {
    const emails = Array.from({ length: 12 }, (_, i) => `m${i}@example.com`);
    const { calls, request } = circlePages([emails.map((email, i) => member(i + 1, email))]);
    const grants = [];
    const db = memoryDb([{ id: "row-1", email: "m0@example.com", status: "active", stripe_session_id: "cs_stripe" }]);
    const summary = await run({
      circle: request,
      supabase: db,
      createEnrollment: async (input) => {
        grants.push(input);
        return { success: true };
      },
    });

    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/space_members\?space_id=\d+&status=all&per_page=100&page=1/);
    assert.equal(calls.some((path) => path.includes("community_members")), false);
    assert.equal(summary.circleCalls, 1);
    assert.equal(summary.circleRoster, 12);
    assert.equal(summary.revocationSkipped, false);
    assert.deepEqual(summary.cancelled, []);
    assert.equal(grants.length, 11);
    assert.equal(grants.some((g) => g.email === "m0@example.com"), false);
    assert.equal(grants[0].stripeSessionId, `circle-sync:${grants[0].email}`);
  });

  test("paginates the roster and still does not list community members", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => member(i + 1, `p${i}@example.com`));
    const page2 = Array.from({ length: 5 }, (_, i) => member(200 + i, `q${i}@example.com`));
    const { calls, request } = circlePages([page1, page2]);
    const summary = await run({
      dry: true,
      circle: request,
      supabase: memoryDb([]),
      createEnrollment: async () => { throw new Error("dry run must not enroll"); },
    });
    const pages = calls.map((path) => new URLSearchParams(path.split("?")[1]).get("page"));
    assert.deepEqual(pages, ["1", "2"]);
    assert.equal(summary.circleCalls, 2);
    assert.equal(summary.circleRoster, 105);
    assert.equal(summary.granted.length, 105);
    assert.equal(summary.dry, true);
  });

  test("grants a new member, reactivates a returning one, and cancels only owned leavers", async () => {
    const fillers = Array.from({ length: 7 }, (_, i) => member(10 + i, `fill${i}@example.com`));
    const roster = [
      member(1, "stays@example.com", "Stays"),
      member(2, "New.Person@Example.com", "New"),
      member(3, "returns@example.com", "Returns"),
      ...fillers,
    ];
    const { request } = circlePages([roster]);
    const rows = [
      { id: "stripe-stay", email: "stays@example.com", status: "active", stripe_session_id: "cs_live" },
      { id: "owned-leave", email: "left@example.com", status: "active", stripe_session_id: "circle-sync:left@example.com" },
      { id: "paywall-leave", email: "paywall-left@example.com", status: "active", stripe_session_id: "circle-paywall-left@example.com" },
      { id: "stripe-leave", email: "bought@example.com", status: "active", stripe_session_id: "cs_bought" },
      { id: "owned-return", email: "returns@example.com", status: "cancelled", stripe_session_id: "circle-sync:returns@example.com" },
      { id: "stripe-refund", email: "new.person@example.com", status: "refunded", stripe_session_id: "cs_refund" },
      { id: "already-cancelled", email: "gone@example.com", status: "cancelled", stripe_session_id: "circle-sync:gone@example.com" },
      ...fillers.map((row, i) => ({
        id: `fill-${i}`,
        email: `fill${i}@example.com`,
        status: "active",
        stripe_session_id: `cs_fill_${i}`,
      })),
    ];
    const db = memoryDb(rows);
    const grants = [];
    const summary = await run({
      circle: request,
      supabase: db,
      createEnrollment: async (input) => {
        grants.push(input);
        return { success: true };
      },
    });

    assert.deepEqual(grants.map((g) => g.email), ["new.person@example.com"]);
    assert.equal(grants[0].stripeSessionId, "circle-sync:new.person@example.com");
    assert.deepEqual(
      db.updates.map((u) => u.id).sort(),
      ["owned-leave", "owned-return", "paywall-leave"]
    );
    const byId = Object.fromEntries(db.updates.map((u) => [u.id, u.patch.status]));
    assert.equal(byId["owned-return"], "active");
    assert.equal(byId["owned-leave"], "cancelled");
    assert.equal(byId["paywall-leave"], "cancelled");
    assert.equal(summary.cancelled.includes("bought@example.com"), false);
    assert.equal(summary.cancelled.includes("stays@example.com"), false);
  });

  test("does not revoke anyone when a roster email is missing and the lookup fails", async () => {
    const roster = pad([member(55, null, "Unresolved")]);
    const { calls, request } = circlePages([roster]);
    const realRequest = async (path) => {
      if (path === "/community_members/55") {
        calls.push(path);
        throw new Error("Circle down");
      }
      return request(path);
    };
    const db = memoryDb([
      { id: "owned-leave", email: "left@example.com", status: "active", stripe_session_id: "circle-sync:left@example.com" },
    ]);
    const summary = await run({
      circle: realRequest,
      supabase: db,
      createEnrollment: async () => ({ success: true }),
    });
    assert.equal(calls.filter((path) => path.startsWith("/community_members/")).length, 1);
    assert.deepEqual(summary.unresolved, ["55"]);
    assert.equal(summary.revocationSkipped, true);
    assert.deepEqual(summary.cancelled, []);
    assert.deepEqual(db.updates, []);
  });

  test("aborts a tiny roster before any enrollment write", async () => {
    const { calls, request } = circlePages([[member(1, "only@example.com")]]);
    let writes = 0;
    await assert.rejects(
      () => run({
        circle: request,
        supabase: { from() { writes += 1; throw new Error("should not read"); } },
        createEnrollment: async () => { writes += 1; return { success: true }; },
      }),
      /below the plausibility floor/
    );
    assert.equal(calls.length, 1);
    assert.equal(writes, 0);
  });

  test("dry run reports grants and cancellations without writing", async () => {
    const roster = pad([member(1, "new@example.com", "New")]);
    const { request } = circlePages([roster]);
    const db = memoryDb([
      { id: "owned-leave", email: "left@example.com", status: "active", stripe_session_id: "circle-sync:left@example.com" },
    ]);
    const summary = await run({
      dry: true,
      circle: request,
      supabase: db,
      createEnrollment: async () => { throw new Error("dry run must not enroll"); },
    });
    assert.equal(summary.dry, true);
    assert.equal(summary.granted.includes("new@example.com"), true);
    assert.deepEqual(summary.cancelled, ["left@example.com"]);
    assert.deepEqual(db.updates, []);
  });
});

describe("schedule", () => {
  test("runs once a day at 07:17 UTC, about 3:17am Eastern", () => {
    const toml = fs.readFileSync(path.join(__dirname, "../../netlify.toml"), "utf8");
    const block = toml.split('[functions."sync-circle-enrollments"]')[1];
    assert.ok(block, "sync-circle-enrollments schedule block missing");
    assert.match(block.split("\n")[1], /schedule = "17 7 \* \* \*"/);
  });
});

describe("handler", () => {
  test("rejects callers that are neither the scheduler nor the sync secret", async () => {
    const res = await handler({ httpMethod: "GET", headers: {}, body: "" });
    assert.equal(res.statusCode, 401);
    const wrong = await handler({
      httpMethod: "GET",
      headers: { "x-sync-secret": "nope" },
      body: "",
    });
    assert.equal(wrong.statusCode, 401);
    const malformed = await handler({ httpMethod: "POST", headers: {}, body: "{" });
    assert.equal(malformed.statusCode, 401);
  });

  test("accepts a Netlify scheduled POST and a secret manual dry run", async () => {
    const mod = require("./sync-circle-enrollments");
    const original = mod.run;
    const seen = [];
    mod.run = async ({ dry }) => {
      seen.push(dry);
      return { dry };
    };
    try {
      const scheduled = await handler({
        httpMethod: "POST",
        headers: {},
        body: JSON.stringify({ next_run: "2026-10-07T12:00:00.000Z" }),
      });
      assert.equal(scheduled.statusCode, 200);
      assert.equal(JSON.parse(scheduled.body).dry, false);

      const manual = await handler({
        httpMethod: "GET",
        headers: { "x-sync-secret": "test-secret" },
        queryStringParameters: { dry: "1" },
        body: "",
      });
      assert.equal(manual.statusCode, 200);
      assert.equal(JSON.parse(manual.body).dry, true);
      assert.deepEqual(seen, [false, true]);
    } finally {
      mod.run = original;
    }
  });
});
