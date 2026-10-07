/**
 * sync-circle-enrollments — Grants prep-tool access to everyone entitled to it
 * through Circle.
 *
 * Runs hourly (see netlify.toml). Access to this tool is gated by the
 * `direct_enrollments` table. Anyone in the NANP Exam Prep space (Circle
 * paywall or Mentorship bundle) who doesn't already have an active row gets
 * one tagged `circle-sync:<email>` (`stripe_session_id` is UNIQUE). Rows this
 * sync or a manual Circle grant created (prefixes `circle-sync:` /
 * `circle-paywall-`) are cancelled when the member leaves the space.
 * Stripe-created rows are never touched.
 *
 * Circle Admin API: GET /space_members already includes each member's email
 * on `community_member.email` (Admin API v2, confirmed against the live
 * roster). A run therefore does not list the whole community. The roster is
 * one request per 100 members. `status=all` is explicit so inactive space
 * members stay in the roster — the default is "all", and dropping them would
 * cancel access they already have.
 *
 * A per-id GET /community_members/:id runs only when a roster record has no
 * email, and only while this run stays within MAX_CALLS_PER_RUN. Past that
 * cap those members are left unresolved and revocation is skipped: a schema
 * surprise must not fan out into one call per member, and must not cancel
 * anyone we couldn't identify.
 *
 * A roster under MIN_PLAUSIBLE_ROSTER aborts with no writes.
 *
 * Manual run: GET with header `x-sync-secret: $SYNC_SECRET`. Add `?dry=1`
 * to report without writing.
 */
const { getServiceClient } = require("./utils/supabase");
const { createEnrollment } = require("./utils/enrollments");

const CIRCLE_API = "https://app.circle.so/api/admin/v2";
const SPACE_ID = process.env.CIRCLE_EXAM_PREP_SPACE_ID || "1450956";
const TOKEN = process.env.CIRCLE_API_TOKEN || "";
const SYNC_SECRET = process.env.SYNC_SECRET || "";
const OWNED_PREFIXES = ["circle-sync:", "circle-paywall-"];
// If Circle ever returns an implausibly small roster (outage, auth failure,
// pagination bug) we must not react to it by cancelling real people.
const MIN_PLAUSIBLE_ROSTER = 10;
// Hourly schedule × this cap stays under ~100 Circle calls/day
// (24 × 4 = 96), including a second roster page and a couple of fallbacks.
const MAX_CALLS_PER_RUN = 4;

async function circle(path) {
  const res = await fetch(`${CIRCLE_API}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      // Cloudflare in front of Circle rejects requests with no browser-like UA.
      "User-Agent": "Mozilla/5.0 (compatible; HCQ-exam-prep-sync)",
    },
  });
  if (!res.ok) throw new Error(`Circle ${path} -> HTTP ${res.status}`);
  return res.json();
}

async function paginate(request, path) {
  const records = [];
  for (let page = 1; page < 50; page++) {
    const data = await request(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    records.push(...(data.records || []));
    if (!data.has_next_page) break;
  }
  return records;
}

function emailFromRosterRecord(record) {
  const nested = record && record.community_member && typeof record.community_member === "object"
    ? record.community_member
    : {};
  const raw = (typeof nested.email === "string" && nested.email)
    || (record && typeof record.email === "string" && record.email)
    || "";
  const email = raw.toLowerCase().trim();
  const name = (typeof nested.name === "string" && nested.name)
    || (record && typeof record.name === "string" && record.name)
    || "";
  const id = record && record.community_member_id != null && record.community_member_id !== ""
    ? String(record.community_member_id)
    : "";
  return { id, email, name };
}

/**
 * @param {Array} roster space-member records
 * @param {(id: string) => Promise<object>} lookup per-id member fetch
 * @param {{ callsAlready: number }} budget
 */
async function resolveEntitled(roster, lookup, { callsAlready }) {
  const entitled = new Map();
  const missing = [];
  for (const record of roster) {
    const parsed = emailFromRosterRecord(record);
    if (parsed.email) {
      entitled.set(parsed.email, parsed.name);
      continue;
    }
    missing.push(parsed.id);
  }

  const budget = Math.max(0, MAX_CALLS_PER_RUN - callsAlready);
  if (missing.length > budget) {
    console.error(
      `[sync-circle] ${missing.length} roster records have no email; not looking them up ` +
      `(${budget} calls left after ${callsAlready} roster requests). Revocation skipped.`
    );
    return { entitled, unresolved: missing.map((id) => id || "missing-id"), directLookups: 0 };
  }

  const unresolved = [];
  let directLookups = 0;
  for (const id of missing) {
    if (!id) {
      unresolved.push("missing-id");
      continue;
    }
    directLookups += 1;
    try {
      const m = await lookup(id);
      const email = m && typeof m.email === "string" ? m.email.toLowerCase().trim() : "";
      if (email) entitled.set(email, (m && m.name) || "");
      else unresolved.push(id);
    } catch {
      unresolved.push(id);
    }
  }
  return { entitled, unresolved, directLookups };
}

function isOwned(row) {
  return OWNED_PREFIXES.some((p) => (row.stripe_session_id || "").startsWith(p));
}

async function run({ dry = false, circle: circleOverride, supabase, createEnrollment: enrollOverride } = {}) {
  if (!circleOverride && !TOKEN) throw new Error("CIRCLE_API_TOKEN is not set");
  const requestOne = circleOverride || circle;
  let circleCalls = 0;
  const request = async (path) => {
    circleCalls += 1;
    return requestOne(path);
  };

  // status=all matches the endpoint default (every current space member,
  // including inactive). Do not switch this to status=active.
  const roster = await paginate(request, `/space_members?space_id=${SPACE_ID}&status=all`);
  if (roster.length < MIN_PLAUSIBLE_ROSTER) {
    throw new Error(`Roster of ${roster.length} is below the plausibility floor; aborting without changes`);
  }

  const rosterCalls = circleCalls;
  const { entitled, unresolved } = await resolveEntitled(
    roster,
    (id) => request(`/community_members/${id}`),
    { callsAlready: rosterCalls }
  );
  // An unresolvable member is unknown, not un-entitled. If anyone is
  // unresolved, skip revocation entirely this run rather than guess.
  const safeToRevoke = unresolved.length === 0;

  const sb = supabase || getServiceClient();
  const enroll = enrollOverride || createEnrollment;
  const { data: rows, error } = await sb
    .from("direct_enrollments")
    .select("id, email, status, stripe_session_id")
    .limit(5000);
  if (error) throw new Error(`enrollments read failed: ${error.message}`);

  const active = new Set(rows.filter((r) => r.status === "active").map((r) => r.email.toLowerCase()));
  const toGrant = [...entitled].filter(([email]) => !active.has(email));
  const granted = [];
  for (const [email, name] of toGrant) {
    if (dry) { granted.push(email); continue; }
    // A previous leave cancels the owned row but leaves its unique
    // stripe_session_id in place, so a rejoin cannot insert circle-sync:<email>
    // again. Reactivate that row instead of inserting a second one.
    const reusable = rows.find((r) =>
      (r.email || "").toLowerCase() === email && r.status !== "active" && isOwned(r)
    );
    if (reusable) {
      const { error: reactivateError } = await sb
        .from("direct_enrollments")
        .update({ status: "active" })
        .eq("id", reusable.id);
      if (!reactivateError) granted.push(email);
      else console.error("[sync-circle] reactivate failed", email, reactivateError.message);
      continue;
    }
    const r = await enroll({
      email, name, stripeSessionId: `circle-sync:${email}`, stripeCustomerId: null, priceId: "", amountPaid: 0,
    });
    if (r.success) granted.push(email);
    else console.error("[sync-circle] grant failed", email, r.error);
  }

  const toCancel = !safeToRevoke ? [] : rows.filter(
    (r) => r.status === "active"
      && isOwned(r)
      && !entitled.has(r.email.toLowerCase())
  );
  const cancelled = [];
  for (const r of toCancel) {
    if (dry) { cancelled.push(r.email); continue; }
    const { error: e2 } = await sb.from("direct_enrollments").update({ status: "cancelled" }).eq("id", r.id);
    if (!e2) cancelled.push(r.email);
    else console.error("[sync-circle] cancel failed", r.email, e2.message);
  }

  const summary = {
    dry: !!dry,
    circleRoster: roster.length,
    entitled: entitled.size,
    unresolved,
    revocationSkipped: !safeToRevoke,
    activeBefore: active.size,
    granted,
    cancelled,
    circleCalls,
  };
  console.log("[sync-circle]", JSON.stringify(summary));
  return summary;
}

exports.handler = async (event) => {
  // Netlify's scheduler POSTs with a JSON body carrying next_run; anything
  // else must present the shared secret.
  let scheduled = false;
  try { scheduled = event.httpMethod === "POST" && !!JSON.parse(event.body || "{}").next_run; } catch { scheduled = false; }
  const manual = !scheduled && SYNC_SECRET && (event.headers["x-sync-secret"] || "") === SYNC_SECRET;
  if (!scheduled && !manual) return { statusCode: 401, body: "unauthorized" };

  const dry = !!(event.queryStringParameters && event.queryStringParameters.dry);
  try {
    const summary = await exports.run({ dry });
    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (err) {
    console.error("[sync-circle] run failed:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

exports.run = run;
exports.emailFromRosterRecord = emailFromRosterRecord;
exports.resolveEntitled = resolveEntitled;
exports.MAX_CALLS_PER_RUN = MAX_CALLS_PER_RUN;
exports.MIN_PLAUSIBLE_ROSTER = MIN_PLAUSIBLE_ROSTER;
