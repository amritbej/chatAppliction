const express = require("express");
const {
  createOrder,
  verifyPayment,
  getTransactions,
  getTransactionDetails,
  getPublicCheckoutDetails,
  refundTransaction,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");

const router = express.Router();

// Optional auth for payment verification from external gateway
const optionalProtect = (req, res, next) => {
  if (req.headers.authorization || req.query?.token || req.body?.token) {
    return protect(req, res, next);
  }
  next();
};

// Order creation
router.post(
  "/orders",
  protect,
  paymentLimiter,
  validate({
    body: {
      recipientId: { required: true, type: "string" },
      amount: { required: true, type: "number", min: 0.01 },
    },
  }),
  createOrder
);

// Payment verification (accessible from approved gateway with HMAC validation)
router.post(
  "/verify",
  optionalProtect,
  paymentLimiter,
  validate({
    body: {
      transactionId: { required: true, type: "string" },
      providerPaymentId: { required: true, type: "string" },
      signature: { required: true, type: "string" },
    },
  }),
  verifyPayment
);

// Public transaction checkout details for hosted payment page
router.get("/public/:transactionId", getPublicCheckoutDetails);

// Transaction history and details
router.get("/", protect, getTransactions);
router.get("/:transactionId", protect, getTransactionDetails);

// Refund
router.post("/:transactionId/refund", protect, refundTransaction);

module.exports = router;
