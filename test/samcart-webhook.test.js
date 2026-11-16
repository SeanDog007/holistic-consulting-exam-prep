const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const {
  handler,
  processNotification,
  authorizeRequest,
  classifyEvent,
  dollarsToCents,
} = require("../netlify/functions/samcart-webhook");
const {
  createEnrollment,
  recordSamcartPurchase,
  revokeSamcartOrder,
} = require("../netlify/functions/utils/enrollments");
const {
  EXAM_PREP_KIT_TAGS,
  buildWelcomeEmail,
  sendWelcomeMagicLink,
} = require("../netlify/functions/utils/exam-prep-access");

const savedEnv = {
  SAMCART_PRODUCT_ID: process.env.SAMCART_PRODUCT_ID,
  SAMCART_PRODUCT_NAME: process.env.SAMCART_PRODUCT_NAME,
  SAMCART_WEBHOOK_SECRET: process.env.SAMCART_WEBHOOK_SECRET,
};

function restoreEnv(name) {
  if (savedEnv[name] == null) delete process.env[name];
  else process.env[name] = savedEnv[name];
}

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
}

function memoryDb(initial = [], { sourceColumn = true } = {}) {
  const rows = initial.map((row) => ({ ...row }));
  let seq = rows.length;
  return {
    rows,
    from(table) {
      if (table !== "direct_enrollments") throw new Error(`unexpected table ${table}`);
      const state = { filters: [], op: "select", row: null, patch: null };
      const matches = (row) => state.filters.every(([col, val]) => row[col] === val);
      const missingSource = (patch) => !sourceColumn
        && patch
        && Object.prototype.hasOwnProperty.call(patch, "source");
      const api = {
        select() { return api; },
        eq(col, val) { state.filters.push([col, val]); return api; },
        order() { return api; },
        insert(row) { state.op = "insert"; state.row = { ...row }; return api; },
        update(patch) { state.op = "update"; state.patch = { ...patch }; return api; },
        limit() {
          return Promise.resolve({ data: rows.filter(matches), error: null });
        },
        single() {
          if (state.op === "insert") return Promise.resolve(finishInsert());
          if (state.op === "update") return Promise.resolve(finishUpdate(true));
          const found = rows.filter(matches);
          return Promise.resolve({ data: found[0] || null, error: null });
        },
        then(resolve, reject) {
          try { resolve(finishUpdate(false)); }
          catch (err) { reject(err); }
        },
      };

      function finishInsert() {
        if (missingSource(state.row)) {
          return {
            data: null,
            error: {
              code: "PGRST204",
              message: "Could not find the 'source' column of 'direct_enrollments' in the schema cache",
            },
          };
        }
        if (rows.some((row) => row.stripe_session_id && row.stripe_session_id === state.row.stripe_session_id)) {
          return {
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint idx_direct_enrollments_stripe_session" },
          };
        }
        if (state.row.status === "active" && rows.some((row) => row.email === state.row.email && row.status === "active")) {
          return {
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint idx_direct_enrollments_active_email" },
          };
        }
        const stored = { id: `row-${++seq}`, ...state.row };
        rows.push(stored);
        return { data: stored, error: null };
      }

      function finishUpdate(single) {
        if (missingSource(state.patch)) {
          return {
            data: null,
            error: {
              code: "PGRST204",
              message: "Could not find the 'source' column of 'direct_enrollments' in the schema cache",
            },
          };
        }
        const found = rows.filter(matches);
        if (single && found.length !== 1) {
          return { data: null, error: { message: `expected 1 row, got ${found.length}` } };
        }
        for (const row of found) Object.assign(row, state.patch);
        return { data: single ? found[0] : found, error: null };
      }

      return api;
    },
  };
}

function wired(db, extras = {}) {
  const calls = { kit: [], welcome: [] };
  const deps = {
    recordPurchase: (input) => recordSamcartPurchase(input, db),
    revokeOrder: (input) => revokeSamcartOrder(input, db),
    syncBuyer: async (input) => {
      calls.kit.push(input);
      return { success: true };
    },
    sendWelcome: async (input) => {
      calls.welcome.push(input);
      return { success: true, id: "email-1" };
    },
    ...extras,
  };
  return { calls, deps };
}

function postEvent(body, { key, header, base64, method = "POST" } = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const event = {
    httpMethod: method,
    headers: {},
    queryStringParameters: key ? { key } : null,
    body: base64 ? Buffer.from(raw).toString("base64") : raw,
    isBase64Encoded: !!base64,
  };
  if (header) event.headers["x-samcart-webhook-secret"] = header;
  return event;
}

describe("samcart webhook", { concurrency: false }, () => {
  before(() => {
    delete process.env.SAMCART_PRODUCT_ID;
    delete process.env.SAMCART_PRODUCT_NAME;
  });

  after(() => {
    restoreEnv("SAMCART_PRODUCT_ID");
    restoreEnv("SAMCART_PRODUCT_NAME");
    restoreEnv("SAMCART_WEBHOOK_SECRET");
  });

  test("converts SamCart dollar amounts to cents and classifies official event types", () => {
    assert.equal(dollarsToCents("300.00"), 30000);
    assert.equal(dollarsToCents(25), 2500);
    assert.equal(dollarsToCents("$1,200.50"), 120050);
    assert.equal(dollarsToCents(""), null);
    assert.equal(dollarsToCents("free"), null);
    assert.equal(classifyEvent("Order"), "purchase");
    assert.equal(classifyEvent("UpsellPurchased"), "purchase");
    assert.equal(classifyEvent("Refund"), "refund");
    assert.equal(classifyEvent("PartialRefund"), "partial-refund");
    assert.equal(classifyEvent("Cancel"), "cancel");
    assert.equal(classifyEvent(""), "ignore");
  });

  test("the welcome email and Kit tags are the Stripe purchase side effects", () => {
    assert.deepEqual(EXAM_PREP_KIT_TAGS, [
      "HC:src:exam-prep",
      "HC:int:bchn-exam",
      "HC:stage:buyer",
      "HC:bought:exam-prep",
    ]);
    const email = buildWelcomeEmail({
      firstName: "A<b>",
      magicUrl: "https://prep.example/.netlify/functions/verify-magic-link?token=abc",
    });
    assert.equal(email.subject, "🎉 Welcome to BCHN® Exam Prep — Access Your Account");
    assert.match(email.html, /Hey A&lt;b&gt;!/);
    assert.match(email.html, /href="https:\/\/prep\.example\/\.netlify\/functions\/verify-magic-link\?token=abc"/);
    assert.match(email.html, /15 minutes/);
    const empty = buildWelcomeEmail({ firstName: "", magicUrl: "https://prep.example/link" });
    assert.match(empty.html, /Hey there!/);

    require("../netlify/functions/stripe-webhook");
    const stripeSrc = fs.readFileSync(path.join(__dirname, "../netlify/functions/stripe-webhook.js"), "utf8");
    assert.match(stripeSrc, /syncBuyerToKit/);
    assert.match(stripeSrc, /sendWelcomeMagicLink/);
    assert.match(stripeSrc, /checkout\.session\.completed/);
    assert.match(stripeSrc, /stripeSessionId: session\.id/);
    assert.match(stripeSrc, /amountPaid: session\.amount_total/);
    assert.equal(stripeSrc.includes("HC:bought:exam-prep"), false);
    assert.equal(stripeSrc.includes("Welcome to BCHN"), false);

    const syncSrc = fs.readFileSync(path.join(__dirname, "../netlify/functions/sync-circle-enrollments.js"), "utf8");
    const owned = syncSrc.slice(syncSrc.indexOf("const OWNED_PREFIXES"), syncSrc.indexOf(";", syncSrc.indexOf("const OWNED_PREFIXES")));
    assert.equal(owned.includes("samcart"), false);
  });

  test("welcome send is skipped when Resend or the magic-link secret is unset", async () => {
    const resend = process.env.RESEND_API_KEY;
    const magic = process.env.MAGIC_LINK_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAGIC_LINK_SECRET;
    try {
      const result = await sendWelcomeMagicLink({ email: "a@example.com", firstName: "A" });
      assert.equal(result.skipped, true);
      assert.equal(result.success, false);
    } finally {
      if (resend == null) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = resend;
      if (magic == null) delete process.env.MAGIC_LINK_SECRET;
      else process.env.MAGIC_LINK_SECRET = magic;
    }
  });

  test("authorizeRequest accepts the query key or header and fails closed", () => {
    process.env.SAMCART_WEBHOOK_SECRET = "correct-secret";
    assert.equal(authorizeRequest({ queryStringParameters: { key: "correct-secret" }, headers: {} }), true);
    assert.equal(authorizeRequest({
      queryStringParameters: null,
      headers: { "x-samcart-webhook-secret": "correct-secret" },
    }), true);
    assert.equal(authorizeRequest({ queryStringParameters: { key: "nope" }, headers: {} }), false);
    assert.equal(authorizeRequest({ queryStringParameters: null, headers: {} }), false);
    delete process.env.SAMCART_WEBHOOK_SECRET;
    assert.equal(authorizeRequest({ queryStringParameters: { key: "correct-secret" }, headers: {} }), false);
    restoreEnv("SAMCART_WEBHOOK_SECRET");
  });

  test("the handler rejects bad secrets, non-POST, and invalid JSON before any enroll", async () => {
    const original = processNotification;
    let calls = 0;
    // handler calls exports.processNotification, so replace the export
    const mod = require("../netlify/functions/samcart-webhook");
    mod.processNotification = async () => {
      calls += 1;
      return { statusCode: 200, body: { received: true, action: "enrolled" } };
    };
    process.env.SAMCART_WEBHOOK_SECRET = "correct-secret";
    try {
      const wrong = await handler(postEvent(fixture("samcart-product-purchased.json"), { key: "nope" }));
      assert.equal(wrong.statusCode, 401);
      const missing = await handler(postEvent(fixture("samcart-product-purchased.json")));
      assert.equal(missing.statusCode, 401);
      delete process.env.SAMCART_WEBHOOK_SECRET;
      const unset = await handler(postEvent("{}", { key: "correct-secret" }));
      assert.equal(unset.statusCode, 401);
      assert.equal(calls, 0);

      process.env.SAMCART_WEBHOOK_SECRET = "correct-secret";
      const get = await handler(postEvent("{}", { key: "correct-secret", method: "GET" }));
      assert.equal(get.statusCode, 405);
      const bad = await handler(postEvent("{", { key: "correct-secret" }));
      assert.equal(bad.statusCode, 400);
      assert.equal(calls, 0);

      const ok = await handler(postEvent(fixture("samcart-product-purchased.json"), {
        header: "correct-secret",
        base64: true,
      }));
      assert.equal(ok.statusCode, 200);
      assert.equal(calls, 1);

      mod.processNotification = async () => { throw new Error("boom"); };
      const blown = await handler(postEvent("{}", { key: "correct-secret" }));
      assert.equal(blown.statusCode, 500);
      assert.equal(JSON.parse(blown.body).error, "internal");
      assert.equal(blown.body.includes("boom"), false);
    } finally {
      mod.processNotification = original;
      restoreEnv("SAMCART_WEBHOOK_SECRET");
    }
  });

  test("a product-purchased notification enrolls once, tags Kit, and sends the welcome link", async () => {
    const db = memoryDb();
    const { calls, deps } = wired(db);
    const payload = fixture("samcart-product-purchased.json");

    const first = await processNotification(payload, deps);
    const second = await processNotification(payload, deps);

    assert.equal(first.statusCode, 200);
    assert.equal(first.body.action, "enrolled");
    assert.equal(first.body.email, "samcart-test-buyer@example.com");
    assert.equal(first.body.orderId, "8560842");
    assert.equal(first.body.emailSent, true);
    assert.equal(second.body.action, "already-enrolled");
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0].stripe_session_id, "samcart:8560842");
    assert.equal(db.rows[0].source, "samcart");
    assert.equal(db.rows[0].status, "active");
    assert.equal(db.rows[0].price_id, "350399");
    assert.equal(db.rows[0].amount_paid, 30000);
    assert.equal(db.rows[0].name, "Test Buyer");
    assert.equal(db.rows[0].email, "samcart-test-buyer@example.com");
    assert.equal(calls.welcome.length, 1);
    assert.equal(calls.kit.length, 1);
    assert.equal(calls.kit[0].firstName, "Test");
    assert.equal(calls.welcome[0].email, "samcart-test-buyer@example.com");
  });

  test("order completed enrolls from the matching line item, not the bump", async () => {
    const db = memoryDb();
    const { calls, deps } = wired(db);
    const result = await processNotification(fixture("samcart-order-completed.json"), deps);
    assert.equal(result.body.action, "enrolled");
    assert.equal(db.rows[0].price_id, "01JD4R75T81DYS8BGD594HT5DF");
    assert.equal(db.rows[0].amount_paid, 30000);
    assert.equal(db.rows[0].stripe_session_id, "samcart:8674655");
    assert.equal(calls.welcome.length, 1);
  });

  test("ignores other products, prospects, and uncharged lines", async () => {
    const db = memoryDb();
    let writes = 0;
    const deps = {
      recordPurchase: async () => { writes += 1; return { success: true }; },
      revokeOrder: async () => { writes += 1; return { success: true }; },
      syncBuyer: async () => { writes += 1; return { success: true }; },
      sendWelcome: async () => { writes += 1; return { success: true }; },
    };
    const other = fixture("samcart-product-purchased.json");
    other.product.name = "Herbalism";
    other.product.id = 999;
    const prospect = {
      first_name: "Pat",
      email: "pat@example.com",
      product_id: "01JD4R75T81DYS8BGD594HT5DF",
      product_name: "NANP Board Exam PREP course",
    };
    const uncharged = fixture("samcart-order-completed.json");
    uncharged.products[1].status = "Refunded";

    const mismatch = await processNotification(other, deps);
    const ignored = await processNotification(prospect, deps);
    const notCharged = await processNotification(uncharged, deps);
    assert.equal(mismatch.body.reason, "product-mismatch");
    assert.equal(ignored.body.reason, "event-type");
    assert.equal(notCharged.body.reason, "product-mismatch");
    assert.equal(writes, 0);
    assert.equal(db.rows.length, 0);
  });

  test("env product id or name can narrow the match", async () => {
    const db = memoryDb();
    const { deps } = wired(db);
    process.env.SAMCART_PRODUCT_ID = "999";
    process.env.SAMCART_PRODUCT_NAME = "Some other course";
    try {
      const result = await processNotification(fixture("samcart-product-purchased.json"), deps);
      assert.equal(result.body.reason, "product-mismatch");
      assert.equal(db.rows.length, 0);
    } finally {
      delete process.env.SAMCART_PRODUCT_ID;
      delete process.env.SAMCART_PRODUCT_NAME;
    }
  });

  test("a numeric product id match works when the name differs", async () => {
    const db = memoryDb();
    const { deps } = wired(db);
    process.env.SAMCART_PRODUCT_ID = "350399";
    process.env.SAMCART_PRODUCT_NAME = "unused name";
    try {
      const payload = fixture("samcart-product-purchased.json");
      payload.product.name = "Renamed in the payload";
      const result = await processNotification(payload, deps);
      assert.equal(result.body.action, "enrolled");
      assert.equal(db.rows[0].stripe_session_id, "samcart:8560842");
    } finally {
      delete process.env.SAMCART_PRODUCT_ID;
      delete process.env.SAMCART_PRODUCT_NAME;
    }
  });

  test("stores the order without a source column, and still enrolls", async () => {
    const db = memoryDb([], { sourceColumn: false });
    const result = await recordSamcartPurchase({
      email: "buyer@example.com",
      name: "Buyer",
      orderId: "8560842",
      productId: "350399",
      amountPaid: 30000,
    }, db);
    assert.equal(result.success, true);
    assert.equal(result.created, true);
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0].stripe_session_id, "samcart:8560842");
    assert.equal(Object.prototype.hasOwnProperty.call(db.rows[0], "source"), false);
    assert.equal(db.rows[0].status, "active");
  });

  test("adopts a Circle grant and leaves a Stripe enrollment untouched", async () => {
    const circle = memoryDb([
      { id: "circle-1", email: "member@example.com", name: "Member", status: "active", stripe_session_id: "circle-sync:member@example.com", amount_paid: 0 },
    ]);
    const adopted = await recordSamcartPurchase({
      email: "member@example.com",
      name: "Member Paid",
      orderId: "42",
      productId: "350399",
      amountPaid: 30000,
    }, circle);
    assert.equal(adopted.adopted, true);
    assert.equal(circle.rows.length, 1);
    assert.equal(circle.rows[0].id, "circle-1");
    assert.equal(circle.rows[0].stripe_session_id, "samcart:42");
    assert.equal(circle.rows[0].source, "samcart");
    assert.equal(circle.rows[0].status, "active");
    assert.equal(circle.rows[0].amount_paid, 30000);

    const stripe = memoryDb([
      { id: "stripe-1", email: "buyer@example.com", status: "active", stripe_session_id: "cs_live_123", source: null },
    ]);
    const { calls, deps } = wired(stripe);
    const payload = fixture("samcart-product-purchased.json");
    payload.customer.email = "buyer@example.com";
    const result = await processNotification(payload, deps);
    assert.equal(result.body.action, "already-active");
    assert.equal(result.body.emailSent, false);
    assert.equal(stripe.rows.length, 1);
    assert.equal(stripe.rows[0].stripe_session_id, "cs_live_123");
    assert.equal(calls.kit.length, 1);
    assert.equal(calls.welcome.length, 0);
  });

  test("a full refund deactivates only the samcart order and a later purchase does not undo it", async () => {
    const db = memoryDb();
    const { calls, deps } = wired(db);
    await processNotification(fixture("samcart-product-purchased.json"), deps);
    const refund = await processNotification(fixture("samcart-product-refunded.json"), deps);
    const again = await processNotification(fixture("samcart-product-purchased.json"), deps);

    assert.equal(refund.statusCode, 200);
    assert.equal(refund.body.action, "refunded");
    assert.equal(again.body.reason, "order-inactive");
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0].status, "refunded");
    assert.equal(db.rows[0].amount_paid, 30000);
    assert.equal(db.rows[0].stripe_session_id, "samcart:8560842");
    assert.equal(calls.welcome.length, 1);

    const repeat = await processNotification(fixture("samcart-product-refunded.json"), deps);
    assert.equal(repeat.body.action, "refunded");
    assert.equal(repeat.body.changed, false);
    assert.equal(db.rows.length, 1);
  });

  test("a refund with no samcart row does not deactivate a Stripe row", async () => {
    const db = memoryDb([
      { id: "stripe-1", email: "samcart-test-buyer@example.com", status: "active", stripe_session_id: "cs_live_keep" },
    ]);
    const { deps } = wired(db);
    const result = await processNotification(fixture("samcart-product-refunded.json"), deps);
    assert.equal(result.body.action, "refunded");
    assert.equal(result.body.placeholder, true);
    assert.equal(db.rows.find((row) => row.id === "stripe-1").status, "active");
    const placeholder = db.rows.find((row) => row.stripe_session_id === "samcart:8560842");
    assert.equal(placeholder.status, "refunded");
    assert.equal(placeholder.source, "samcart");
  });

  test("a refund without an email still deactivates a stored samcart order", async () => {
    const db = memoryDb([
      { id: "s1", email: "buyer@example.com", status: "active", stripe_session_id: "samcart:8560842", amount_paid: 30000, source: "samcart" },
    ]);
    const { deps } = wired(db);
    const payload = fixture("samcart-product-refunded.json");
    payload.customer.email = "";
    const result = await processNotification(payload, deps);
    assert.equal(result.body.action, "refunded");
    assert.equal(db.rows[0].status, "refunded");
    assert.equal(db.rows[0].email, "buyer@example.com");

    const empty = memoryDb();
    const missing = await processNotification(payload, wired(empty).deps);
    assert.equal(missing.body.reason, "missing-email");
    assert.equal(empty.rows.length, 0);
  });

  test("adopts a circle-paywall grant even before the source column exists", async () => {
    const db = memoryDb([
      { id: "paywall-1", email: "member@example.com", status: "active", stripe_session_id: "circle-paywall-member@example.com" },
    ], { sourceColumn: false });
    const result = await recordSamcartPurchase({
      email: "member@example.com",
      name: "Member",
      orderId: "77",
      productId: "350399",
      amountPaid: 30000,
    }, db);
    assert.equal(result.adopted, true);
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0].stripe_session_id, "samcart:77");
    assert.equal(Object.prototype.hasOwnProperty.call(db.rows[0], "source"), false);
    assert.equal(db.rows[0].status, "active");
  });

  test("a partial refund does not remove access", async () => {
    const db = memoryDb([
      { id: "s1", email: "samcart-test-buyer@example.com", status: "active", stripe_session_id: "samcart:8560842", amount_paid: 30000, source: "samcart" },
    ]);
    const { deps } = wired(db);
    const result = await processNotification(fixture("samcart-partial-refund.json"), deps);
    assert.equal(result.body.action, "partial-refund-ignored");
    assert.equal(db.rows[0].status, "active");
    assert.equal(db.rows[0].amount_paid, 30000);
  });

  test("Cancel marks the samcart order cancelled", async () => {
    const db = memoryDb([
      { id: "s1", email: "samcart-test-buyer@example.com", status: "active", stripe_session_id: "samcart:8560842", source: "samcart" },
    ]);
    const { deps } = wired(db);
    const payload = fixture("samcart-product-refunded.json");
    payload.type = "Cancel";
    const result = await processNotification(payload, deps);
    assert.equal(result.body.action, "cancelled");
    assert.equal(db.rows[0].status, "cancelled");
  });

  test("a failed enroll returns 500 and does not send the welcome email", async () => {
    let welcomes = 0;
    const result = await processNotification(fixture("samcart-product-purchased.json"), {
      recordPurchase: async () => ({ success: false, error: "db down" }),
      revokeOrder: async () => { throw new Error("unexpected"); },
      syncBuyer: async () => ({ success: true }),
      sendWelcome: async () => { welcomes += 1; return { success: true }; },
    });
    assert.equal(result.statusCode, 500);
    assert.equal(result.body.action, "enroll-failed");
    assert.equal(welcomes, 0);
  });

  test("Kit failing still sends the welcome email after the row is stored", async () => {
    const db = memoryDb();
    const { deps } = wired(db, {
      syncBuyer: async () => { throw new Error("kit down"); },
    });
    const result = await processNotification(fixture("samcart-product-purchased.json"), deps);
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.action, "enrolled");
    assert.equal(result.body.emailSent, true);
    assert.equal(result.body.kit, "failed");
    assert.equal(db.rows[0].status, "active");
  });

  test("a unique conflict on insert is treated as the order already recorded", async () => {
    const row = {
      id: "existing",
      email: "buyer@example.com",
      status: "active",
      stripe_session_id: "samcart:99",
      source: "samcart",
    };
    let inserted = false;
    const client = {
      from() {
        const state = { filters: [], op: "select" };
        const api = {
          select() { return api; },
          eq(col, val) { state.filters.push([col, val]); return api; },
          order() { return api; },
          insert() { state.op = "insert"; return api; },
          limit() {
            const wantsSession = state.filters.some(([col]) => col === "stripe_session_id");
            return Promise.resolve({ data: wantsSession && inserted ? [row] : [], error: null });
          },
          single() {
            inserted = true;
            return Promise.resolve({
              data: null,
              error: { code: "23505", message: "duplicate key value violates unique constraint idx_direct_enrollments_stripe_session" },
            });
          },
        };
        return api;
      },
    };
    const result = await recordSamcartPurchase({
      email: "buyer@example.com",
      name: "Buyer",
      orderId: "99",
      productId: "350399",
      amountPaid: 30000,
    }, client);
    assert.equal(result.success, true);
    assert.equal(result.alreadyRecorded, true);
    assert.equal(result.created, false);
    assert.equal(result.enrollment.stripe_session_id, "samcart:99");
  });

  test("stripe createEnrollment stays idempotent per active email", async () => {
    const db = memoryDb();
    const first = await createEnrollment({
      email: "Stripe@Example.com",
      name: "Stripe Buyer",
      stripeSessionId: "cs_test_123",
      stripeCustomerId: "cus_123",
      priceId: "price_123",
      amountPaid: 30000,
    }, db);
    const second = await createEnrollment({
      email: "stripe@example.com",
      name: "Again",
      stripeSessionId: "cs_test_456",
      stripeCustomerId: "cus_456",
      priceId: "price_123",
      amountPaid: 30000,
    }, db);
    assert.equal(first.success, true);
    assert.equal(first.alreadyEnrolled, undefined);
    assert.equal(first.enrollment.email, "stripe@example.com");
    assert.equal(Object.prototype.hasOwnProperty.call(first.enrollment, "source"), false);
    assert.equal(second.alreadyEnrolled, true);
    assert.equal(second.enrollment.stripe_session_id, "cs_test_123");
    assert.equal(db.rows.length, 1);
  });

  test("UpsellPurchased for the exam prep product enrolls the same way", async () => {
    const db = memoryDb();
    const { deps } = wired(db);
    const payload = fixture("samcart-product-purchased.json");
    payload.type = "UpsellPurchased";
    payload.order.id = 4242;
    const result = await processNotification(payload, deps);
    assert.equal(result.body.action, "enrolled");
    assert.equal(db.rows[0].stripe_session_id, "samcart:4242");
  });

  test("the local sample script posts a fixture at localhost and refuses production", async () => {
    const hits = [];
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        hits.push({ url: req.url, body: Buffer.concat(chunks).toString("utf8") });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ received: true }));
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const script = path.join(__dirname, "../tools/send-samcart-sample.mjs");
    const run = (args) => new Promise((resolve) => {
      const child = spawn(process.execPath, [script, ...args], {
        env: { ...process.env, SAMCART_WEBHOOK_SECRET: "sample-secret" },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
    try {
      const local = await run(["purchase", `http://127.0.0.1:${port}/.netlify/functions/samcart-webhook`]);
      assert.equal(local.code, 0, local.stderr);
      assert.equal(hits.length, 1);
      const hitUrl = new URL(hits[0].url, "http://127.0.0.1");
      assert.equal(hitUrl.searchParams.get("key"), "sample-secret");
      assert.equal(local.stdout.includes("sample-secret"), false);
      assert.deepEqual(JSON.parse(hits[0].body), fixture("samcart-product-purchased.json"));

      const refused = await run(["refund", "https://prep.holisticconsultinghq.com/.netlify/functions/samcart-webhook"]);
      assert.notEqual(refused.code, 0);
      assert.match(refused.stderr, /Refusing to POST/);
      assert.equal(hits.length, 1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
