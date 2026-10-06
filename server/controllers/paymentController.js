const paymentService = require("../services/payments/paymentService");
const Transaction = require("../models/Transaction");

const createOrder = async (req, res, next) => {
  try {
    const { recipientId, roomId, amount, note, idempotencyKey } = req.body;
    const orderData = await paymentService.createPaymentOrder({
      senderId: req.user._id,
      recipientId,
      roomId,
      amount: Number(amount),
      note,
      idempotencyKey,
    });

    res.status(201).json({
      success: true,
      data: orderData,
      message: "Payment order created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const {
      transactionId,
      providerPaymentId,
      providerOrderId,
      signature,
      paymentMethod,
    } = req.body;

    const result = await paymentService.verifyPayment({
      transactionId,
      providerPaymentId,
      providerOrderId,
      signature,
      paymentMethod,
    });

    res.json({
      success: true,
      data: result.transaction,
      message: "Payment verified successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const { type, status, page, limit, search } = req.query;
    const data = await paymentService.getTransactions({
      userId: req.user._id,
      type,
      status,
      page,
      limit,
      search,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const getTransactionDetails = async (req, res, next) => {
  try {
    const transaction = await paymentService.getTransactionDetails(
      req.params.transactionId,
      req.user._id
    );

    res.json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
};

const refundTransaction = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const refunded = await paymentService.refundTransaction({
      transactionId: req.params.transactionId,
      userId: req.user._id,
      reason,
    });

    res.json({
      success: true,
      data: refunded,
      message: "Refund processed successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getPublicCheckoutDetails = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const transaction = await Transaction.findOne({ transactionId })
      .populate("sender", "username displayName")
      .populate("recipient", "username displayName");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const razorpayKey = process.env.RAZORPAY_KEY_ID || "";

    res.json({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        orderId: transaction.providerOrderId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        note: transaction.note,
        recipient: transaction.recipient?.displayName || transaction.recipient?.username || "Recipient",
        sender: transaction.sender?.displayName || transaction.sender?.username || "Sender",
        key: razorpayKey,
        provider: transaction.provider,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getTransactions,
  getTransactionDetails,
  getPublicCheckoutDetails,
  refundTransaction,
};
