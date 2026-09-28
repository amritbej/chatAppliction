const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["razorpay", "mock", "stripe"],
      default: "razorpay",
    },
    providerOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1, // Integer minor units (e.g. paise: 100 paise = 1 INR)
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "processing",
        "success",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "created",
      index: true,
    },
    paymentMethod: {
      type: String,
      default: "unknown",
    },
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      index: true,
    },
    relatedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    failureReason: {
      type: String,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["none", "requested", "partial", "full"],
      default: "none",
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Helpful compound indexes for fast query performance
transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ recipient: 1, createdAt: -1 });
transactionSchema.index({ chatRoom: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
