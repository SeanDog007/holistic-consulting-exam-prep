/**
 * Stripe utility — shared Stripe client for Netlify functions
 */
const Stripe = require("stripe");

let _stripe = null;

function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

module.exports = { getStripe };
