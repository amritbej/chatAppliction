const express = require("express");
const {
  createOrder,
  verifyPayment,
  getTransactions,
  getTransactionDetails,
  refundTransaction,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");

const router = express.Router();

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

// Payment verification
router.post(
  "/verify",
  protect,
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

// Transaction history and details
router.get("/", protect, getTransactions);
router.get("/:transactionId", protect, getTransactionDetails);

// Refund
router.post("/:transactionId/refund", protect, refundTransaction);

module.exports = router;
