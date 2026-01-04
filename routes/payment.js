const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments');
const { isLoggedIn } = require('../middleware');

// Create a checkout session (POST)
router.post('/create-checkout-session', isLoggedIn, paymentsController.createCheckoutSession);

// Webhook endpoint — must use raw body; we add express.raw middleware here
router.post('/webhook', express.raw({ type: 'application/json' }), paymentsController.webhookHandler);

// Simple success/cancel pages
router.get('/success', paymentsController.successPage);
router.get('/cancel', paymentsController.cancelPage);

module.exports = router;
