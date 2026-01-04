const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  amount: Number,
  currency: {
    type: String,
    default: 'inr',
  },
  method: {
    type: String,
    default: 'stripe-test',
  },
  stripeSessionId: String,
  stripePaymentIntentId: String,
  status: {
    type: String,
    default: 'created',
  },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
