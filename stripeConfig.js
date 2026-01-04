// Load local .env in non-production so process.env has keys
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('\nERROR: STRIPE_SECRET_KEY is not set.\nSet STRIPE_SECRET_KEY in your .env (use test key sk_test_...) and restart the server.\n');
  // Throw so the app fails fast and you see the problem in logs
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

// initialize stripe with the provided key
const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });

module.exports = stripe;
