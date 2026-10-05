const { prisma } = require("../config/db");

const formatMessageRecord = (msg) => {
  if (!msg) return null;
  const clone = { ...msg };
  clone._id = msg.id;
  clone.room = msg.roomId;

  // Format sender
  if (msg.sender) {
    clone.sender = {
      _id: msg.sender.id,
      id: msg.sender.id,
      username: msg.sender.username,
      avatar: msg.sender.avatar,
      toString() {
        return this.id;
      },
    };
  } else if (msg.senderId) {
    clone.sender = msg.senderId;
  }

  // Format replyTo
  if (msg.replyTo) {
    clone.replyTo = {
      _id: msg.replyTo.id,
      id: msg.replyTo.id,
      content: msg.replyTo.content,
      type: msg.replyTo.type,
      fileName: msg.replyTo.fileName,
      sender: msg.replyTo.sender ? {
        _id: msg.replyTo.sender.id,
        id: msg.replyTo.sender.id,
        username: msg.replyTo.sender.username,
        avatar: msg.replyTo.sender.avatar,
        toString() {
          return this.id;
        },
      } : null,
      toString() {
        return this.id;
      },
    };
  }

  // Format mentions
  if (Array.isArray(msg.mentions)) {
    clone.mentions = msg.mentions.map((m) => {
      const u = m.user || m;
      return {
        _id: u.id || u._id,
        id: u.id || u._id,
        username: u.username,
        avatar: u.avatar,
        toString() {
          return this.id || this._id;
        },
      };
    });
  } else {
    clone.mentions = [];
  }

  // Format reactions
  if (Array.isArray(msg.reactions)) {
    clone.reactions = msg.reactions.map((r) => {
      const u = r.user ? {
        _id: r.user.id,
        id: r.user.id,
        username: r.user.username,
        avatar: r.user.avatar,
        toString() {
          return this.id;
        },
      } : (r.userId || "");

      return {
        id: r.id,
        emoji: r.emoji,
        user: u,
      };
    });
  } else {
    clone.reactions = [];
  }

  // Format deletedFor and readBy
  if (Array.isArray(msg.deletedFor)) {
    clone.deletedFor = msg.deletedFor.map((d) => d.userId || d);
  } else {
    clone.deletedFor = [];
  }

  if (Array.isArray(msg.readBy)) {
    clone.readBy = msg.readBy.map((r) => r.userId || r);
  } else {
    clone.readBy = [];
  }

  // Format embedded payment
  if (msg.paymentTransactionId) {
    clone.payment = {
      transactionId: msg.paymentTransactionId,
      amount: msg.paymentAmount,
      currency: msg.paymentCurrency || "INR",
      status: msg.paymentStatus,
      note: msg.paymentNote || "",
    };
  }

  // Methods for compatibility
  clone.save = async function () {
    await prisma.message.update({
      where: { id: this.id },
      data: {
        content: this.content,
        isEdited: Boolean(this.isEdited),
        editedAt: this.editedAt || null,
        isPinned: Boolean(this.isPinned),
        pinnedAt: this.pinnedAt || null,
        isDeleted: Boolean(this.isDeleted),
      },
    });

    if (Array.isArray(this.reactions)) {
      await prisma.messageReaction.deleteMany({ where: { messageId: this.id } });
      for (const r of this.reactions) {
        const uId = r.user?._id || r.user?.id || r.user || r.userId;
        if (uId && r.emoji) {
          try {
            await prisma.messageReaction.create({
              data: {
                messageId: this.id,
                userId: uId.toString(),
                emoji: r.emoji,
              },
            });
          } catch {
            // Ignored if duplicate
          }
        }
      }
    }

    if (Array.isArray(this.deletedFor)) {
      for (const d of this.deletedFor) {
        const uId = d?._id || d?.id || d;
        if (uId) {
          try {
            await prisma.messageDeletedFor.upsert({
              where: {
                messageId_userId: { messageId: this.id, userId: uId.toString() },
              },
              create: { messageId: this.id, userId: uId.toString() },
              update: {},
            });
          } catch {
            // Ignored
          }
        }
      }
    }

    const refreshed = await Message.findById(this.id);
    Object.assign(this, refreshed);
    return this;
  };

  return clone;
};

const messageInclude = {
  sender: { select: { id: true, username: true, avatar: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      fileName: true,
      sender: { select: { id: true, username: true, avatar: true } },
    },
  },
  mentions: {
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  },
  reactions: {
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  },
  deletedFor: true,
  readBy: true,
};

class MessageModel {
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
          const msg = await prisma.message.findUnique({
            where: { id: chainable._id },
            include: messageInclude,
          });
          resolve(formatMessageRecord(msg));
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  findOne(query = {}) {
    let where = {};
    if (query._id) where.id = query._id.toString();
    if (query.id) where.id = query.id.toString();
    if (query.room) where.roomId = query.room.toString();

    const chainable = {
      _where: where,
      select() {
        return this;
      },
      populate() {
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const msg = await prisma.message.findFirst({
            where: chainable._where,
            include: messageInclude,
          });
          resolve(formatMessageRecord(msg));
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  find(query = {}) {
    let where = {};
    let take = 50;
    let orderBy = [{ createdAt: "desc" }];

    if (query.room) {
      where.roomId = query.room.toString();
    }

    if (query.deletedFor && query.deletedFor.$ne) {
      const excludedUserId = query.deletedFor.$ne.toString();
      where.deletedFor = {
        none: { userId: excludedUserId },
      };
    }

    if (query.isDeleted === false) {
      where.isDeleted = false;
    }

    if (query.isPinned !== undefined) {
      where.isPinned = Boolean(query.isPinned);
    }

    if (query.createdAt && query.createdAt.$lt) {
      where.createdAt = { lt: new Date(query.createdAt.$lt) };
    }

    if (query.content) {
      if (typeof query.content === "object" && query.content.$regex) {
        where.content = { contains: query.content.$regex, mode: "insensitive" };
      } else {
        where.content = { contains: query.content, mode: "insensitive" };
      }
    }

    const chainable = {
      _where: where,
      _orderBy: orderBy,
      _take: take,
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
      limit(n) {
        this._take = parseInt(n, 10);
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const messages = await prisma.message.findMany({
            where: chainable._where,
            include: messageInclude,
            orderBy: chainable._orderBy,
            take: chainable._take,
          });

          resolve(messages.map(formatMessageRecord));
        } catch (err) {
          reject(err);
        }
      },
    };

    return chainable;
  }

  async create(data) {
    const roomId = data.room ? data.room.toString() : data.roomId;
    const senderId = data.sender ? data.sender.toString() : data.senderId;
    const replyToId = data.replyTo ? data.replyTo.toString() : data.replyToId || null;
    const mentionIds = Array.isArray(data.mentions) ? data.mentions.map((id) => id.toString()) : [];
    const readByIds = Array.isArray(data.readBy) ? data.readBy.map((id) => id.toString()) : [senderId];

    const payment = data.payment || {};

    const created = await prisma.message.create({
      data: {
        roomId,
        senderId,
        content: data.content || "",
        type: data.type || "text",
        fileName: data.fileName || null,
        fileSize: data.fileSize ? parseInt(data.fileSize, 10) : null,
        mimeType: data.mimeType || null,
        fileUrl: data.fileUrl || null,
        replyToId,
        paymentTransactionId: payment.transactionId || null,
        paymentAmount: payment.amount ? parseInt(payment.amount, 10) : null,
        paymentCurrency: payment.currency || "INR",
        paymentStatus: payment.status || null,
        paymentNote: payment.note || null,
        mentions: {
          create: mentionIds.map((userId) => ({ userId })),
        },
        readBy: {
          create: readByIds.map((userId) => ({ userId })),
        },
      },
      include: messageInclude,
    });

    return formatMessageRecord(created);
  }

  async findByIdAndUpdate(id, updates = {}, options = {}) {
    if (!id) return null;
    const cleanId = id.toString();
    const data = {};

    if (updates.content !== undefined) data.content = updates.content;
    if (updates.isEdited !== undefined) data.isEdited = Boolean(updates.isEdited);
    if (updates.editedAt !== undefined) data.editedAt = updates.editedAt;
    if (updates.isPinned !== undefined) data.isPinned = Boolean(updates.isPinned);
    if (updates.pinnedAt !== undefined) data.pinnedAt = updates.pinnedAt;
    if (updates.isDeleted !== undefined) data.isDeleted = Boolean(updates.isDeleted);

    if (updates["payment.status"]) {
      data.paymentStatus = updates["payment.status"];
    } else if (updates.payment?.status) {
      data.paymentStatus = updates.payment.status;
    }

    const updated = await prisma.message.update({
      where: { id: cleanId },
      data,
      include: messageInclude,
    });

    return formatMessageRecord(updated);
  }

  async updateMany(filter = {}, update = {}) {
    const where = {};
    if (filter.room) where.roomId = filter.room.toString();
    if (filter._id?.$in) {
      where.id = { in: filter._id.$in.map((id) => id.toString()) };
    }

    if (update.$addToSet?.readBy) {
      const userId = update.$addToSet.readBy.toString();
      const messages = await prisma.message.findMany({
        where,
        select: { id: true },
      });

      for (const m of messages) {
        try {
          await prisma.messageReadBy.upsert({
            where: {
              messageId_userId: { messageId: m.id, userId },
            },
            create: { messageId: m.id, userId },
            update: {},
          });
        } catch {
          // Ignored if already marked
        }
      }
      return { count: messages.length };
    }

    return { count: 0 };
  }
}

const Message = new MessageModel();
module.exports = Message;
