const stripe = require('../stripeConfig');
const Listing = require('../models/listing');
const Payment = require('../models/payment');

module.exports.createCheckoutSession = async (req, res) => {
  try {
    const listingId = req.body.listingId || req.params.listingId;
    const listing = await Listing.findById(listingId);
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect('/listings');
    }
    if (listing.sold) {
      req.flash('error', 'Listing already sold');
      return res.redirect(`/listings/${listingId}`);
    }
    // Amount in smallest currency unit
    const unitAmount = Math.round((listing.price || 0) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      // Require billing address and optionally collect phone — required by some regulations (eg. India exports)
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      // If we have the user's email, prefill it so Stripe can attach customer details
      ...(req.user && req.user.email ? { customer_email: req.user.email } : {}),
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: { name: listing.title, description: listing.description },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.DOMAIN || 'http://localhost:8080'}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN || 'http://localhost:8080'}/payments/cancel`,
      metadata: {
        listingId: listing._id.toString(),
        buyerId: req.user ? req.user._id.toString() : '',
      },
    });

    // For simplicity redirect the user to Stripe Checkout
    return res.redirect(303, session.url);
  } catch (err) {
    console.error('createCheckoutSession error', err);
    req.flash('error', 'Unable to create checkout session');
    return res.redirect('/listings');
  }
};

// Webhook: verify signature and handle checkout.session.completed
module.exports.webhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Return a response quickly while processing; Stripe expects a 2xx
  try {
    // Handle the event types we care about
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Idempotency: check if we already processed this session
      const existing = await Payment.findOne({ stripeSessionId: session.id });
      if (existing) {
        console.log(`Webhook: session ${session.id} already processed, skipping.`);
        return res.status(200).json({ received: true });
      }

      const listingId = session.metadata?.listingId;
      const buyerId = session.metadata?.buyerId;

      try {
        const listing = await Listing.findById(listingId);
        if (listing && !listing.sold) {
          listing.sold = true;
          if (buyerId) listing.buyer = buyerId;
          await listing.save();
          console.log(`Listing ${listingId} marked sold by webhook session ${session.id}`);
        }

        // Record payment
        const payment = new Payment({
          listing: listingId,
          buyer: buyerId,
          amount: session.amount_total || undefined,
          currency: session.currency || 'inr',
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent || undefined,
          status: 'succeeded',
        });
        await payment.save();
        console.log(`Payment recorded for session ${session.id}`);
      } catch (err) {
        console.error('Error processing checkout.session.completed', err);
        // Don't return 4xx here; respond 200 so Stripe won't keep retrying excessively
      }
    }
    // Acknowledge receipt
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Unexpected webhook handler error', err);
    // Still acknowledge to avoid retries; investigate via logs
    res.status(200).json({ received: true });
  }
};

module.exports.successPage = (req, res) => {
  res.render('payments/success.ejs');
};

module.exports.cancelPage = (req, res) => {
  res.render('payments/cancel.ejs');
};
