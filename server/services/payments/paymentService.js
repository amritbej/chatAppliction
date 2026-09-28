const crypto = require("crypto");
const Transaction = require("../../models/Transaction");
const Message = require("../../models/Message");
const Room = require("../../models/Room");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const RazorpayProvider = require("./razorpayProvider");
const MockProvider = require("./mockProvider");
const { AppError } = require("../../middleware/errorHandler");

class PaymentService {
  constructor() {
    this.razorpayProvider = new RazorpayProvider();
    this.mockProvider = new MockProvider();
    this.minAmountPaise = parseInt(process.env.MIN_PAYMENT_AMOUNT || "100", 10); // Default ₹1
    this.maxAmountPaise = parseInt(process.env.MAX_PAYMENT_AMOUNT || "10000000", 10); // Default ₹100,000
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  getProvider() {
    const requested = (process.env.PAYMENT_PROVIDER || "").toLowerCase();
    if (requested === "razorpay" && this.razorpayProvider.isConfigured()) {
      return this.razorpayProvider;
    }
    if (requested === "mock") {
      return this.mockProvider;
    }
    // Fallback: if razorpay is configured use it, else fallback to mock in dev/test
    return this.razorpayProvider.isConfigured()
      ? this.razorpayProvider
      : this.mockProvider;
  }

  /**
   * Converts INR amount (e.g. 500 or 500.50) safely to integer minor units (paise).
   */
  toMinorUnits(amount) {
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      throw new AppError("Invalid payment amount", 400, "INVALID_AMOUNT");
    }
    return Math.round(amount * 100);
  }

  /**
   * Initiates a payment order.
   */
  async createPaymentOrder({
    senderId,
    recipientId,
    roomId,
    amount,
    note = "",
    idempotencyKey = null,
  }) {
    if (!senderId || !recipientId) {
      throw new AppError("Sender and recipient are required", 400, "MISSING_PARTICIPANTS");
    }

    if (senderId.toString() === recipientId.toString()) {
      throw new AppError("Cannot send money to yourself", 400, "SELF_PAYMENT_NOT_ALLOWED");
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new AppError("Recipient account not found", 404, "RECIPIENT_NOT_FOUND");
    }

    if (roomId) {
      const room = await Room.findById(roomId);
      if (!room) {
        throw new AppError("Chat room not found", 404, "ROOM_NOT_FOUND");
      }
      const memberIds = room.members.map((m) => m.toString());
      if (!memberIds.includes(senderId.toString()) || !memberIds.includes(recipientId.toString())) {
        throw new AppError("Both users must be members of the room", 403, "NOT_ROOM_MEMBERS");
      }
    }

    const amountMinor = this.toMinorUnits(amount);

    if (amountMinor < this.minAmountPaise) {
      const minINR = (this.minAmountPaise / 100).toFixed(2);
      throw new AppError(`Minimum payment amount is ₹${minINR}`, 400, "AMOUNT_BELOW_MINIMUM");
    }

    if (amountMinor > this.maxAmountPaise) {
      const maxINR = (this.maxAmountPaise / 100).toFixed(2);
      throw new AppError(`Maximum payment amount is ₹${maxINR}`, 400, "AMOUNT_EXCEEDS_MAXIMUM");
    }

    // Idempotency check
    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey, sender: senderId });
      if (existing) {
        return {
          transactionId: existing.transactionId,
          orderId: existing.providerOrderId,
          amount: existing.amount,
          currency: existing.currency,
          provider: existing.provider,
          status: existing.status,
        };
      }
    }

    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const provider = this.getProvider();

    // 1. Create transaction in "created" state
    const transaction = await Transaction.create({
      transactionId,
      provider: provider.name,
      sender: senderId,
      recipient: recipientId,
      amount: amountMinor,
      currency: "INR",
      note: note.trim().slice(0, 200),
      status: "created",
      chatRoom: roomId || null,
      idempotencyKey: idempotencyKey || null,
    });

    try {
      // 2. Gateway Order
      const order = await provider.createOrder({
        amount: amountMinor,
        currency: "INR",
        receipt: transactionId,
        notes: {
          transactionId,
          senderId: senderId.toString(),
          recipientId: recipientId.toString(),
          roomId: roomId ? roomId.toString() : "",
        },
      });

      // 3. Move to "pending"
      transaction.providerOrderId = order.orderId;
      transaction.status = "pending";
      await transaction.save();

      return {
        transactionId: transaction.transactionId,
        orderId: order.orderId,
        amount: transaction.amount,
        currency: transaction.currency,
        key: order.key,
        provider: provider.name,
        status: transaction.status,
      };
    } catch (err) {
      transaction.status = "failed";
      transaction.failureReason = err.message || "Failed to create gateway order";
      await transaction.save();
      throw new AppError(transaction.failureReason, 502, "GATEWAY_ORDER_CREATION_FAILED");
    }
  }

  /**
   * Verifies payment signature and finalizes the transaction.
   */
  async verifyPayment({
    transactionId,
    providerPaymentId,
    providerOrderId,
    signature,
    paymentMethod = "unknown",
  }) {
    const transaction = await Transaction.findOne({ transactionId })
      .populate("sender", "username avatar")
      .populate("recipient", "username avatar");

    if (!transaction) {
      throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
    }

    // Prevent duplicate processing
    if (transaction.status === "success") {
      return {
        success: true,
        alreadyProcessed: true,
        transaction,
      };
    }

    if (transaction.status !== "pending" && transaction.status !== "created") {
      throw new AppError(
        `Transaction cannot be verified in ${transaction.status} status`,
        400,
        "INVALID_TRANSACTION_STATE"
      );
    }

    const provider = this.getProvider();
    const effectiveOrderId = providerOrderId || transaction.providerOrderId;

    const isValid = await provider.verifyPayment({
      orderId: effectiveOrderId,
      paymentId: providerPaymentId,
      signature,
    });

    if (!isValid) {
      transaction.status = "failed";
      transaction.failureReason = "Cryptographic signature verification failed";
      transaction.providerPaymentId = providerPaymentId || null;
      await transaction.save();

      this.emitPaymentEvent(transaction, "payment:failed", {
        reason: transaction.failureReason,
      });

      throw new AppError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    // Success transition
    transaction.status = "success";
    transaction.providerPaymentId = providerPaymentId;
    transaction.paymentMethod = paymentMethod;
    transaction.completedAt = new Date();
    await transaction.save();

    // Create Chat Payment Message if associated with a chat room
    let paymentMessage = null;
    if (transaction.chatRoom) {
      paymentMessage = await Message.create({
        room: transaction.chatRoom,
        sender: transaction.sender._id,
        content: `Payment of ₹${(transaction.amount / 100).toFixed(2)}`,
        type: "payment",
        payment: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: "success",
          note: transaction.note,
        },
      });

      await Room.findByIdAndUpdate(transaction.chatRoom, {
        lastMessage: paymentMessage._id,
      });

      transaction.relatedMessage = paymentMessage._id;
      await transaction.save();

      // Emit populated message to room
      const populatedMessage = await Message.findById(paymentMessage._id)
        .populate("sender", "username avatar")
        .populate("mentions", "username avatar");

      if (this.io) {
        this.io.to(transaction.chatRoom.toString()).emit("message:receive", populatedMessage);
      }
    }

    // In-app notification for recipient
    await Notification.create({
      user: transaction.recipient._id,
      type: "payment:received",
      title: "Payment Received",
      body: `You received ₹${(transaction.amount / 100).toFixed(2)} from ${transaction.sender.username}`,
      data: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        senderId: transaction.sender._id,
      },
    });

    // In-app notification for sender
    await Notification.create({
      user: transaction.sender._id,
      type: "payment:success",
      title: "Payment Sent",
      body: `Your payment of ₹${(transaction.amount / 100).toFixed(2)} to ${transaction.recipient.username} was successful`,
      data: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        recipientId: transaction.recipient._id,
      },
    });

    // Real-time socket event
    this.emitPaymentEvent(transaction, "payment:success");

    return {
      success: true,
      transaction,
      message: paymentMessage,
    };
  }

  /**
   * Helper to emit targeted, sanitized payment events via Socket.IO.
   */
  emitPaymentEvent(transaction, event, extra = {}) {
    if (!this.io) return;

    const payload = {
      transactionId: transaction.transactionId,
      senderId: transaction.sender?._id || transaction.sender,
      recipientId: transaction.recipient?._id || transaction.recipient,
      roomId: transaction.chatRoom,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      note: transaction.note,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    if (transaction.chatRoom) {
      this.io.to(transaction.chatRoom.toString()).emit(event, payload);
    }
    // Also emit directly to individual user rooms if established
    this.io.to(`user_${transaction.sender?._id || transaction.sender}`).emit(event, payload);
    this.io.to(`user_${transaction.recipient?._id || transaction.recipient}`).emit(event, payload);
  }

  /**
   * Fetches paginated transaction history for a user with totals.
   */
  async getTransactions({ userId, type = "all", status, page = 1, limit = 20, search }) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (type === "sent") {
      query.sender = userId;
    } else if (type === "received") {
      query.recipient = userId;
    } else {
      query.$or = [{ sender: userId }, { recipient: userId }];
    }

    if (status) {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        ...(query.$or || []),
        { transactionId: { $regex: search.trim(), $options: "i" } },
        { note: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [transactions, total, totalsAgg] = await Promise.all([
      Transaction.find(query)
        .populate("sender", "username avatar")
        .populate("recipient", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        {
          $match: {
            $or: [{ sender: userId }, { recipient: userId }],
            status: "success",
          },
        },
        {
          $group: {
            _id: null,
            totalSent: {
              $sum: {
                $cond: [{ $eq: ["$sender", userId] }, "$amount", 0],
              },
            },
            totalReceived: {
              $sum: {
                $cond: [{ $eq: ["$recipient", userId] }, "$amount", 0],
              },
            },
          },
        },
      ]),
    ]);

    const totalSent = totalsAgg[0]?.totalSent || 0;
    const totalReceived = totalsAgg[0]?.totalReceived || 0;

    return {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      summary: {
        totalSentMinor: totalSent,
        totalReceivedMinor: totalReceived,
        totalSentINR: (totalSent / 100).toFixed(2),
        totalReceivedINR: (totalReceived / 100).toFixed(2),
      },
    };
  }

  /**
   * Retrieves single transaction details with ownership check.
   */
  async getTransactionDetails(transactionId, userId) {
    const transaction = await Transaction.findOne({ transactionId })
      .populate("sender", "username avatar email")
      .populate("recipient", "username avatar email")
      .populate("chatRoom", "name isGroup");

    if (!transaction) {
      throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
    }

    const isParticipant =
      transaction.sender._id.toString() === userId.toString() ||
      transaction.recipient._id.toString() === userId.toString();

    if (!isParticipant) {
      throw new AppError("You are not authorized to view this transaction", 403, "UNAUTHORIZED_TRANSACTION_ACCESS");
    }

    return transaction;
  }

  /**
   * Refunds a successful transaction.
   */
  async refundTransaction({ transactionId, userId, reason = "" }) {
    const transaction = await Transaction.findOne({ transactionId })
      .populate("sender", "username avatar")
      .populate("recipient", "username avatar");

    if (!transaction) {
      throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
    }

    // Only sender can initiate refund for peer payment
    if (transaction.sender._id.toString() !== userId.toString()) {
      throw new AppError("Only the sender can request a refund", 403, "REFUND_NOT_AUTHORIZED");
    }

    if (transaction.status !== "success") {
      throw new AppError("Only successful transactions can be refunded", 400, "CANNOT_REFUND_NON_SUCCESS");
    }

    if (transaction.refundStatus === "full") {
      throw new AppError("Transaction is already refunded", 400, "ALREADY_REFUNDED");
    }

    const provider = this.getProvider();
    await provider.refundPayment({
      paymentId: transaction.providerPaymentId,
      amount: transaction.amount,
      notes: { reason },
    });

    transaction.status = "refunded";
    transaction.refundStatus = "full";
    transaction.refundAmount = transaction.amount;
    await transaction.save();

    // Update related chat message if present
    if (transaction.relatedMessage) {
      await Message.findByIdAndUpdate(transaction.relatedMessage, {
        "payment.status": "refunded",
      });
    }

    this.emitPaymentEvent(transaction, "payment:refunded", { reason });

    return transaction;
  }
}

const paymentService = new PaymentService();
module.exports = paymentService;
