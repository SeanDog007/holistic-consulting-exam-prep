/**
 * sync-circle-enrollments — Grants prep-tool access to everyone entitled to it
 * through Circle.
 *
 * Runs on a schedule (see netlify.toml). Access to this tool is gated by the
 * `direct_enrollments` table, which until now was only ever written by
 * stripe-webhook.js — i.e. by purchases made on /buy.html. Anyone who bought
 * through Circle's paywall (or gets exam prep bundled with the Mentorship)
 * landed in the Circle course, followed its "Start Here" link here, and was
 * told they had no account. On 2026-09-23 that was 65 of 90 course members.
 *
 * Each run:
 *   1. Reads the roster of the NANP Exam Prep course space in Circle.
 *   2. Resolves each member's email.
 *   3. Creates an active enrollment for any member who doesn't have one,
 *      tagged `circle-sync:<email>` so these rows are distinguishable from
 *      Stripe purchases. (`stripe_session_id` is UNIQUE, hence per-email.)
 *   4. Cancels rows this sync created for members who have since left the
 *      space (refund / removal). Stripe-created rows are never touched.
 *
 * Manual run for verification: GET with header `x-sync-secret: $SYNC_SECRET`,
 * add `?dry=1` to report without writing.
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

async function paginate(path) {
  const records = [];
  for (let page = 1; page < 50; page++) {
    const data = await circle(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    records.push(...(data.records || []));
    if (!data.has_next_page) break;
  }
  return records;
}

async function run({ dry }) {
  if (!TOKEN) throw new Error("CIRCLE_API_TOKEN is not set");

  // 1 + 2. Roster of the course space, resolved to emails via the community
  // member list (a few pages) rather than one lookup per member.
  const roster = await paginate(`/space_members?space_id=${SPACE_ID}`);
  if (roster.length < MIN_PLAUSIBLE_ROSTER) {
    throw new Error(`Roster of ${roster.length} is below the plausibility floor; aborting without changes`);
  }
  const memberIds = new Set(roster.map((r) => String(r.community_member_id)));
  const members = await paginate("/community_members");
  const entitled = new Map(); // email -> name
  const seen = new Set();
  for (const m of members) {
    if (m.email && memberIds.has(String(m.id))) {
      entitled.set(m.email.toLowerCase().trim(), m.name || "");
      seen.add(String(m.id));
    }
  }
  // The list endpoint omits some accounts (deactivated / not yet confirmed)
  // that are still in the space and still resolve individually. Look those
  // up one by one. First observed 2026-09-23: 5 of 90 were missing this way.
  const unresolved = [];
  for (const id of memberIds) {
    if (seen.has(id)) continue;
    try {
      const m = await circle(`/community_members/${id}`);
      if (m && m.email) entitled.set(m.email.toLowerCase().trim(), m.name || "");
      else unresolved.push(id);
    } catch (e) {
      unresolved.push(id);
    }
  }
  // An unresolvable member is unknown, not un-entitled. If anyone is
  // unresolved, skip revocation entirely this run rather than guess.
  const safeToRevoke = unresolved.length === 0;

  // 3. Grant what's missing.
  const sb = getServiceClient();
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
    const r = await createEnrollment({
      email, name, stripeSessionId: `circle-sync:${email}`, stripeCustomerId: null, priceId: "", amountPaid: 0,
    });
    if (r.success) granted.push(email);
    else console.error("[sync-circle] grant failed", email, r.error);
  }

  // 4. Revoke only rows this sync (or a manual Circle grant) created, for
  // people no longer in the space.
  const toCancel = !safeToRevoke ? [] : rows.filter(
    (r) => r.status === "active"
      && OWNED_PREFIXES.some((p) => (r.stripe_session_id || "").startsWith(p))
      && !entitled.has(r.email.toLowerCase())
  );
  const cancelled = [];
  for (const r of toCancel) {
    if (dry) { cancelled.push(r.email); continue; }
    const { error: e2 } = await sb.from("direct_enrollments").update({ status: "cancelled" }).eq("id", r.id);
    if (!e2) cancelled.push(r.email);
    else console.error("[sync-circle] cancel failed", r.email, e2.message);
  }

  const summary = { dry: !!dry, circleRoster: roster.length, entitled: entitled.size, unresolved, revocationSkipped: !safeToRevoke, activeBefore: active.size, granted, cancelled };
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
    const summary = await run({ dry });
    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (err) {
    console.error("[sync-circle] run failed:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

exports.run = run; // for local verification
