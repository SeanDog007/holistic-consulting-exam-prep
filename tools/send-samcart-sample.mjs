#!/usr/bin/env node
/**
 * POST a sample SamCart notification at a local webhook.
 *
 * Does not talk to Supabase, Kit, or Resend itself. The function you point
 * it at will, so this refuses any host that is not localhost.
 *
 *   SAMCART_WEBHOOK_SECRET=... node tools/send-samcart-sample.mjs purchase
 *   SAMCART_WEBHOOK_SECRET=... node tools/send-samcart-sample.mjs refund http://127.0.0.1:8888/.netlify/functions/samcart-webhook
 *
 * Run `npx netlify dev` first. Do not point this at production.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const fixtures = {
  purchase: "samcart-product-purchased.json",
  refund: "samcart-product-refunded.json",
};

const kind = process.argv[2] || "purchase";
const urlArg = process.argv[3] || "http://127.0.0.1:8888/.netlify/functions/samcart-webhook";
const secret = process.env.SAMCART_WEBHOOK_SECRET || "";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

async function main() {
  if (!fixtures[kind]) {
    console.error("Usage: node tools/send-samcart-sample.mjs <purchase|refund> [local-url]");
    process.exit(1);
  }
  if (!secret) {
    console.error("Set SAMCART_WEBHOOK_SECRET to the same value the local function expects.");
    process.exit(1);
  }

  let target;
  try {
    target = new URL(urlArg);
  } catch {
    console.error("The webhook URL is not valid.");
    process.exit(1);
  }
  if (!isLocalHost(target.hostname)) {
    console.error(
      `Refusing to POST a sample at ${target.hostname}. Use netlify dev and http://127.0.0.1:8888/.netlify/functions/samcart-webhook.`
    );
    process.exit(1);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const body = fs.readFileSync(path.join(here, "..", "test", "fixtures", fixtures[kind]));
  target.searchParams.set("key", secret);

  const response = await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const text = await response.text();
  console.log(response.status);
  console.log(text);
  process.exit(response.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
