const { prisma } = require("../config/db");

const formatTransactionRecord = (txn) => {
  if (!txn) return null;
  const clone = { ...txn };
  clone._id = txn.id;

  if (txn.sender) {
    clone.sender = {
      _id: txn.sender.id,
      id: txn.sender.id,
      username: txn.sender.username,
      avatar: txn.sender.avatar,
      toString() {
        return this.id;
      },
    };
  } else if (txn.senderId) {
    clone.sender = txn.senderId;
  }

  if (txn.recipient) {
    clone.recipient = {
      _id: txn.recipient.id,
      id: txn.recipient.id,
      username: txn.recipient.username,
      avatar: txn.recipient.avatar,
      toString() {
        return this.id;
      },
    };
  } else if (txn.recipientId) {
    clone.recipient = txn.recipientId;
  }

  if (txn.chatRoomId) {
    clone.chatRoom = txn.chatRoomId;
  }
  if (txn.relatedMessageId) {
    clone.relatedMessage = txn.relatedMessageId;
  }

  // Chainable populate
  clone.populate = async function () {
    return this;
  };

  // Method to save
  clone.save = async function () {
    const updated = await Transaction.findOneAndUpdate(
      { id: this.id },
      this
    );
    Object.assign(this, updated);
    return this;
  };

  return clone;
};

const txnInclude = {
  sender: { select: { id: true, username: true, avatar: true } },
  recipient: { select: { id: true, username: true, avatar: true } },
};

const buildWhereClause = (query = {}) => {
  let where = {};
  if (query.transactionId) where.transactionId = query.transactionId;
  if (query.providerOrderId) where.providerOrderId = query.providerOrderId;
  if (query.providerPaymentId) where.providerPaymentId = query.providerPaymentId;
  if (query.idempotencyKey) where.idempotencyKey = query.idempotencyKey;
  if (query._id) where.id = query._id.toString();
  if (query.id) where.id = query.id.toString();
  if (query.sender) where.senderId = query.sender.toString();
  if (query.recipient) where.recipientId = query.recipient.toString();
  if (query.chatRoom) where.chatRoomId = query.chatRoom.toString();
  if (query.status) where.status = query.status;

  if (query.$or && Array.isArray(query.$or)) {
    where.OR = query.$or.map((cond) => {
      const item = {};
      if (cond.sender) item.senderId = cond.sender.toString();
      if (cond.recipient) item.recipientId = cond.recipient.toString();
      if (cond.transactionId) {
        if (typeof cond.transactionId === "object" && cond.transactionId.$regex) {
          item.transactionId = { contains: cond.transactionId.$regex, mode: "insensitive" };
        } else {
          item.transactionId = cond.transactionId;
        }
      }
      if (cond.note) {
        if (typeof cond.note === "object" && cond.note.$regex) {
          item.note = { contains: cond.note.$regex, mode: "insensitive" };
        } else {
          item.note = cond.note;
        }
      }
      return item;
    });
  }

  return where;
};

class TransactionModel {
  findById(id) {
    const cleanId = id ? id.toString() : null;
    const chainable = {
      _id: cleanId,
      populate() {
        return this;
      },
      then: async (resolve, reject) => {
        try {
          if (!chainable._id) return resolve(null);
          const txn = await prisma.transaction.findUnique({
            where: { id: chainable._id },
            include: txnInclude,
          });
          resolve(formatTransactionRecord(txn));
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  findOne(query = {}) {
    const where = buildWhereClause(query);
    const chainable = {
      _where: where,
      populate() {
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const txn = await prisma.transaction.findFirst({
            where: chainable._where,
            include: txnInclude,
          });
          resolve(formatTransactionRecord(txn));
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  find(query = {}) {
    const where = buildWhereClause(query);
    let take = 50;
    let skip = undefined;
    let orderBy = [{ createdAt: "desc" }];

    const chainable = {
      _where: where,
      _orderBy: orderBy,
      _take: take,
      _skip: skip,
      populate() {
        return this;
      },
      sort(sortObj) {
        if (sortObj) {
          this._orderBy = Object.entries(sortObj).map(([k, v]) => ({
            [k]: v === -1 ? "desc" : "asc",
          }));
        }
        return this;
      },
      skip(n) {
        this._skip = parseInt(n, 10);
        return this;
      },
      limit(n) {
        this._take = parseInt(n, 10);
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const txns = await prisma.transaction.findMany({
            where: chainable._where,
            include: txnInclude,
            orderBy: chainable._orderBy,
            take: chainable._take,
            skip: chainable._skip,
          });
          resolve(txns.map(formatTransactionRecord));
        } catch (err) {
          reject(err);
        }
      },
    };

    return chainable;
  }

  async countDocuments(query = {}) {
    const where = buildWhereClause(query);
    return prisma.transaction.count({ where });
  }

  async aggregate(pipeline = []) {
    // Specifically handles user totals for sent/received successful transactions
    const matchStage = pipeline.find((p) => p.$match)?.$match || {};
    let userId = null;
    if (matchStage.$or) {
      for (const cond of matchStage.$or) {
        if (cond.sender) userId = cond.sender.toString();
        if (cond.recipient) userId = cond.recipient.toString();
      }
    }

    if (!userId) {
      return [{ totalSent: 0, totalReceived: 0 }];
    }

    const [sentAgg, receivedAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { senderId: userId, status: "success" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { recipientId: userId, status: "success" },
        _sum: { amount: true },
      }),
    ]);

    return [
      {
        totalSent: sentAgg._sum.amount || 0,
        totalReceived: receivedAgg._sum.amount || 0,
      },
    ];
  }

  async create(data) {
    const senderId = data.sender ? data.sender.toString() : data.senderId;
    const recipientId = data.recipient ? data.recipient.toString() : data.recipientId;

    const created = await prisma.transaction.create({
      data: {
        transactionId: data.transactionId,
        provider: data.provider || "razorpay",
        providerOrderId: data.providerOrderId || null,
        providerPaymentId: data.providerPaymentId || null,
        senderId,
        recipientId,
        amount: parseInt(data.amount, 10),
        currency: data.currency || "INR",
        note: data.note || "",
        status: data.status || "created",
        paymentMethod: data.paymentMethod || "unknown",
        chatRoomId: data.chatRoom ? data.chatRoom.toString() : data.chatRoomId || null,
        relatedMessageId: data.relatedMessage ? data.relatedMessage.toString() : data.relatedMessageId || null,
        failureReason: data.failureReason || null,
        refundStatus: data.refundStatus || "none",
        refundAmount: data.refundAmount ? parseInt(data.refundAmount, 10) : 0,
        idempotencyKey: data.idempotencyKey || null,
        metadata: data.metadata || {},
        completedAt: data.completedAt || null,
      },
      include: txnInclude,
    });

    return formatTransactionRecord(created);
  }

  async findOneAndUpdate(filter = {}, updates = {}, options = {}) {
    const existing = await this.findOne(filter);
    if (!existing) return null;

    const data = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.providerPaymentId !== undefined) data.providerPaymentId = updates.providerPaymentId;
    if (updates.paymentMethod !== undefined) data.paymentMethod = updates.paymentMethod;
    if (updates.failureReason !== undefined) data.failureReason = updates.failureReason;
    if (updates.refundStatus !== undefined) data.refundStatus = updates.refundStatus;
    if (updates.refundAmount !== undefined) data.refundAmount = parseInt(updates.refundAmount, 10);
    if (updates.metadata !== undefined) data.metadata = updates.metadata;
    if (updates.completedAt !== undefined) data.completedAt = updates.completedAt;
    if (updates.relatedMessage !== undefined) {
      data.relatedMessageId = updates.relatedMessage ? updates.relatedMessage.toString() : null;
    }

    const updated = await prisma.transaction.update({
      where: { id: existing.id },
      data,
      include: txnInclude,
    });

    return formatTransactionRecord(updated);
  }
}

const Transaction = new TransactionModel();
module.exports = Transaction;
