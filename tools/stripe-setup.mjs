/**
 * stripe-setup.mjs — Creates the BCHN Exam Prep product and price in Stripe.
 *
 * Usage: node tools/stripe-setup.mjs
 *
 * Requires STRIPE_SECRET_KEY in .env
 * Saves product/price IDs to stripe_products.json
 */

import Stripe from "stripe";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Load .env
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY not found in .env");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCT_NAME = "BCHN Exam Prep";
const PRODUCT_DESCRIPTION = "Adaptive practice exams, spaced repetition, domain mastery tracking, and complete study guide for BCHN board certification.";
const PRICE_CENTS = parseInt(process.env.PRICE_CENTS || "30000", 10); // $300 one-time

async function main() {
  console.log("Setting up BCHN Exam Prep in Stripe...\n");

  // Check for existing product
  const existing = await stripe.products.search({
    query: 'metadata["hcq_id"]:"bchn-exam-prep"',
  });

  let product;
  if (existing.data.length > 0) {
    product = existing.data[0];
    console.log(`✓ Found existing product: ${product.name} (${product.id})`);
  } else {
    product = await stripe.products.create({
      name: `HCQ: ${PRODUCT_NAME}`,
      description: PRODUCT_DESCRIPTION,
      metadata: { hcq_id: "bchn-exam-prep" },
    });
    console.log(`+ Created product: ${product.name} (${product.id})`);
  }

  // Check for existing price
  const prices = await stripe.prices.list({ product: product.id, active: true });
  let price = prices.data.find(p => p.unit_amount === PRICE_CENTS && !p.recurring);

  if (price) {
    console.log(`✓ Found existing price: $${(price.unit_amount / 100).toFixed(2)} (${price.id})`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: PRICE_CENTS,
      currency: "usd",
      metadata: { hcq_id: "bchn-exam-prep" },
    });
    console.log(`+ Created price: $${(price.unit_amount / 100).toFixed(2)} (${price.id})`);
  }

  const output = {
    "bchn-exam-prep": {
      productId: product.id,
      priceId: price.id,
      name: PRODUCT_NAME,
      amount: PRICE_CENTS,
    },
  };

  const outPath = path.join(ROOT, "stripe_products.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${outPath}`);
  console.log(`\nAdd this to your Netlify env vars:`);
  console.log(`  EXAM_PREP_PRICE_ID=${price.id}`);
  console.log(`\nDone!`);
}

main().catch(err => {
  console.error("Stripe setup failed:", err.message);
  process.exit(1);
});
