/**
 * samcart-webhook — Grants BCHN® Exam Prep portal access from SamCart.
 *
 * POST /.netlify/functions/samcart-webhook?key=$SAMCART_WEBHOOK_SECRET
 *
 * SamCart's App Marketplace → Webhooks integration sends an HTTP POST of
 * JSON to a Notify URL. The official payloads are documented at
 * https://help.samcart.com/support/solutions/articles/60000506436-using-webhooks-on-samcart
 * SamCart does not sign that body. The Notify URL field also cannot set a
 * custom header, so the shared secret travels in the `key` query parameter.
 * A header `x-samcart-webhook-secret` is accepted too, for local replay.
 * Comparison is constant-time. Requests are rejected when the env var is
 * unset. Generate a URL-safe value with `openssl rand -hex 32`.
 *
 * Act only on the exam-prep product. Match `product.id` against
 * SAMCART_PRODUCT_ID and `product.name` against SAMCART_PRODUCT_NAME
 * (comma-separated; either match is enough). Defaults:
 *   SAMCART_PRODUCT_ID=01JD4R75T81DYS8BGD594HT5DF
 *   SAMCART_PRODUCT_NAME=NANP Board Exam PREP course
 * SamCart's published samples use a numeric product.id. The name match
 * covers that until the numeric id is added to SAMCART_PRODUCT_ID.
 *
 * Events this function acts on (payload `type`):
 *   Order, UpsellPurchased  → enroll (Product purchased / Order completed)
 *   Refund                  → status refunded (Product refunded)
 *   Cancel                  → status cancelled (subscription canceled)
 *   PartialRefund           → acknowledged, access stays
 * Anything else, including Prospect Created, is acknowledged and ignored.
 *
 * A full refund or cancel only changes the row whose stripe_session_id is
 * `samcart:<order id>`. Stripe rows and Circle grants are not revoked here.
 * The daily Circle sync does not cancel `samcart:` rows.
 *
 * Dashboard (product "NANP Board Exam PREP course"):
 *   Apps → App Marketplace → Webhooks → Install
 *   Notify URL: https://prep.holisticconsultinghq.com/.netlify/functions/samcart-webhook?key=<secret>
 *   Product Specific rule → Send NotifyURL Post → Product purchased
 *   Product Specific rule → Send NotifyURL Post → Product refunded
 */
const crypto = require("crypto");
const { recordSamcartPurchase, revokeSamcartOrder } = require("./utils/enrollments");
const { syncBuyerToKit, sendWelcomeMagicLink } = require("./utils/exam-prep-access");

const DEFAULT_PRODUCT_IDS = ["01JD4R75T81DYS8BGD594HT5DF"];
const DEFAULT_PRODUCT_NAMES = ["NANP Board Exam PREP course"];

const PURCHASE_TYPES = new Set(["order", "upsellpurchased"]);
const REFUND_TYPES = new Set(["refund"]);
const CANCEL_TYPES = new Set(["cancel"]);
const PARTIAL_TYPES = new Set(["partialrefund"]);

function listEnv(name, fallback) {
  const raw = process.env[name];
  const source = raw == null || String(raw).trim() === "" ? fallback.join(",") : String(raw);
  return source.split(",").map((part) => part.trim()).filter(Boolean);
}

function configuredProductIds() {
  return listEnv("SAMCART_PRODUCT_ID", DEFAULT_PRODUCT_IDS);
}

function configuredProductNames() {
  return listEnv("SAMCART_PRODUCT_NAME", DEFAULT_PRODUCT_NAMES).map((name) => name.toLowerCase());
}

function safeEqual(provided, expected) {
  const left = crypto.createHash("sha256").update(String(provided)).digest();
  const right = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(left, right);
}

function authorizeRequest(event) {
  const expected = process.env.SAMCART_WEBHOOK_SECRET || "";
  if (!expected) {
    console.error("[samcart-webhook] SAMCART_WEBHOOK_SECRET is not set");
    return false;
  }
  const query = (event && event.queryStringParameters) || {};
  const headers = (event && event.headers) || {};
  const fromHeader = headers["x-samcart-webhook-secret"] || headers["X-Samcart-Webhook-Secret"] || "";
  const provided = query.key || fromHeader;
  if (!provided) return false;
  return safeEqual(provided, expected);
}

function parseBody(event) {
  const raw = event && event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : (event && event.body) || "";
  if (!String(raw).trim()) {
    const error = new Error("empty body");
    error.statusCode = 400;
    throw error;
  }
  const payload = JSON.parse(raw);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    const error = new Error("payload must be an object");
    error.statusCode = 400;
    throw error;
  }
  return payload;
}

function classifyEvent(type) {
  const key = String(type || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (PURCHASE_TYPES.has(key)) return "purchase";
  if (REFUND_TYPES.has(key)) return "refund";
  if (CANCEL_TYPES.has(key)) return "cancel";
  if (PARTIAL_TYPES.has(key)) return "partial-refund";
  return "ignore";
}

function productsFrom(payload) {
  if (Array.isArray(payload.products) && payload.products.length > 0) return payload.products;
  if (payload.product && typeof payload.product === "object") return [payload.product];
  return [];
}

function productMatches(product) {
  if (!product || typeof product !== "object") return false;
  const id = product.id == null ? "" : String(product.id).trim();
  const name = product.name == null ? "" : String(product.name).trim().toLowerCase();
  if (id && configuredProductIds().includes(id)) return true;
  if (name && configuredProductNames().includes(name)) return true;
  return false;
}

function isCharged(product) {
  if (product.status == null || String(product.status).trim() === "") return true;
  return String(product.status).trim().toLowerCase() === "charged";
}

function matchingProduct(payload, kind) {
  const matches = productsFrom(payload).filter((product) => productMatches(product));
  if (kind !== "purchase") return matches[0] || null;
  return matches.find((product) => isCharged(product)) || null;
}

function dollarsToCents(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  const cleaned = String(value).trim().replace(/[$,]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

function buyerFrom(payload) {
  const customer = payload.customer && typeof payload.customer === "object" ? payload.customer : {};
  const email = String(customer.email || "").trim().toLowerCase();
  const firstName = String(customer.first_name || "").trim();
  const lastName = String(customer.last_name || "").trim();
  return {
    email,
    firstName,
    name: [firstName, lastName].filter(Boolean).join(" "),
  };
}

function orderIdFrom(payload) {
  const order = payload.order && typeof payload.order === "object" ? payload.order : {};
  if (order.id == null || String(order.id).trim() === "") return "";
  return String(order.id).trim();
}

function amountCents(payload, product) {
  if (product && product.price != null && product.price !== "") return dollarsToCents(product.price);
  const order = payload.order && typeof payload.order === "object" ? payload.order : {};
  return dollarsToCents(order.total);
}

function usableEmail(email) {
  return Boolean(email) && email.includes("@") && !/\s/.test(email);
}

function defaultDeps() {
  return {
    recordPurchase: (input) => recordSamcartPurchase(input),
    revokeOrder: (input) => revokeSamcartOrder(input),
    syncBuyer: (input) => syncBuyerToKit(input),
    sendWelcome: (input) => sendWelcomeMagicLink(input),
  };
}

async function notifyBuyer(deps, buyer, { sendEmail }) {
  let kit = { skipped: true };
  let welcome = { skipped: true };
  try {
    kit = await deps.syncBuyer({ email: buyer.email, firstName: buyer.firstName });
  } catch (err) {
    console.error("[samcart-webhook] Kit sync failed:", err.message);
    kit = { success: false, error: err.message };
  }
  if (sendEmail) {
    try {
      welcome = await deps.sendWelcome({ email: buyer.email, firstName: buyer.firstName });
    } catch (err) {
      console.error("[samcart-webhook] Welcome email failed:", err.message);
      welcome = { success: false, error: err.message };
    }
  }
  return { kit, welcome, emailSent: !!(welcome && welcome.success) };
}

function ignored(reason, extra) {
  return { statusCode: 200, body: { received: true, action: "ignored", reason, ...extra } };
}

async function processNotification(payload, deps = defaultDeps()) {
  const type = payload.type || "";
  const kind = classifyEvent(type);
  if (kind === "ignore") return ignored("event-type", { type: type || null });

  const product = matchingProduct(payload, kind);
  if (!product) return ignored("product-mismatch", { type });

  const buyer = buyerFrom(payload);
  const orderId = orderIdFrom(payload);
  if (!orderId) return ignored("missing-order-id", { type });

  const orderFields = {
    email: buyer.email,
    name: buyer.name,
    orderId,
    productId: product.id == null ? "" : String(product.id),
    amountPaid: amountCents(payload, product),
  };

  if (kind === "partial-refund") {
    return {
      statusCode: 200,
      body: { received: true, action: "partial-refund-ignored", orderId, email: buyer.email || null },
    };
  }

  if (kind === "refund" || kind === "cancel") {
    const status = kind === "refund" ? "refunded" : "cancelled";
    const result = await deps.revokeOrder({ ...orderFields, status });
    if (!result.success && /email is required/i.test(result.error || "")) {
      return ignored("missing-email", { type, orderId });
    }
    if (!result.success) {
      return { statusCode: 500, body: { received: false, action: "revoke-failed", orderId, email: buyer.email || null } };
    }
    return {
      statusCode: 200,
      body: {
        received: true,
        action: status,
        orderId,
        email: buyer.email || null,
        placeholder: !!result.placeholder,
        changed: result.changed !== false,
      },
    };
  }

  if (!usableEmail(buyer.email)) return ignored("missing-email", { type, orderId });

  const result = await deps.recordPurchase(orderFields);
  if (!result.success) {
    return { statusCode: 500, body: { received: false, action: "enroll-failed", orderId, email: buyer.email } };
  }

  if (result.alreadyRecorded && result.enrollment && result.enrollment.status !== "active") {
    return ignored("order-inactive", { type, orderId, email: buyer.email });
  }
  if (result.alreadyRecorded) {
    return {
      statusCode: 200,
      body: { received: true, action: "already-enrolled", orderId, email: buyer.email },
    };
  }

  const grant = !!(result.created || result.adopted);
  const sideEffects = await notifyBuyer(deps, buyer, { sendEmail: grant });
  return {
    statusCode: 200,
    body: {
      received: true,
      action: result.adopted ? "adopted-circle-grant" : (grant ? "enrolled" : "already-active"),
      orderId,
      email: buyer.email,
      emailSent: sideEffects.emailSent,
      kit: sideEffects.kit && sideEffects.kit.success === false && !sideEffects.kit.skipped ? "failed" : "ok",
    },
  };
}

exports.handler = async (event) => {
  if (!authorizeRequest(event || {})) {
    return { statusCode: 401, body: "unauthorized" };
  }
  if (!event || event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let payload;
  try {
    payload = parseBody(event);
  } catch (err) {
    console.error("[samcart-webhook] invalid json");
    return { statusCode: 400, body: "invalid json" };
  }

  try {
    const result = await exports.processNotification(payload);
    const body = result.body || {};
    console.log("[samcart-webhook]", JSON.stringify({
      action: body.action,
      reason: body.reason,
      orderId: body.orderId,
      email: body.email,
    }));
    return { statusCode: result.statusCode, body: JSON.stringify(result.body) };
  } catch (err) {
    console.error("[samcart-webhook] failed:", err.message);
    return { statusCode: 500, body: JSON.stringify({ received: false, error: "internal" }) };
  }
};

exports.processNotification = processNotification;
exports.authorizeRequest = authorizeRequest;
exports.classifyEvent = classifyEvent;
exports.dollarsToCents = dollarsToCents;
exports.matchingProduct = matchingProduct;
exports.DEFAULT_PRODUCT_IDS = DEFAULT_PRODUCT_IDS;
exports.DEFAULT_PRODUCT_NAMES = DEFAULT_PRODUCT_NAMES;
