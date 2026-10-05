const { prisma } = require("../config/db");

const formatBlockedRecord = (b) => {
  if (!b) return null;
  const clone = { ...b };
  clone._id = b.id;
  clone.user = b.userId;
  clone.blockedUser = b.blockedUserId;
  return clone;
};

class BlockedUserModel {
  async create(data) {
    const userId = data.user ? data.user.toString() : data.userId;
    const blockedUserId = data.blockedUser ? data.blockedUser.toString() : data.blockedUserId;

    const created = await prisma.blockedUser.create({
      data: {
        userId,
        blockedUserId,
        reason: data.reason || "",
      },
    });
    return formatBlockedRecord(created);
  }

  async findOne(query = {}) {
    let where = {};
    if (query.user) where.userId = query.user.toString();
    if (query.blockedUser) where.blockedUserId = query.blockedUser.toString();

    const record = await prisma.blockedUser.findFirst({ where });
    return formatBlockedRecord(record);
  }

  async find(query = {}) {
    let where = {};
    if (query.user) where.userId = query.user.toString();

    const records = await prisma.blockedUser.findMany({ where });
    return records.map(formatBlockedRecord);
  }

  async deleteOne(query = {}) {
    let where = {};
    if (query.user && query.blockedUser) {
      where.userId_blockedUserId = {
        userId: query.user.toString(),
        blockedUserId: query.blockedUser.toString(),
      };
      await prisma.blockedUser.delete({ where });
    }
  }
}

const BlockedUser = new BlockedUserModel();
module.exports = BlockedUser;
