const { prisma } = require("../config/db");

const formatSessionRecord = (s) => {
  if (!s) return null;
  const clone = { ...s };
  clone._id = s.id;
  return clone;
};

class DeviceSessionModel {
  async upsertSession({ userId, pushToken, platform = "unknown", deviceInfo = "" }) {
    const cleanUserId = userId.toString();
    const session = await prisma.deviceSession.upsert({
      where: {
        userId_pushToken: {
          userId: cleanUserId,
          pushToken,
        },
      },
      create: {
        userId: cleanUserId,
        pushToken,
        platform,
        deviceInfo,
        lastActive: new Date(),
      },
      update: {
        platform,
        deviceInfo,
        lastActive: new Date(),
      },
    });
    return formatSessionRecord(session);
  }

  async find(query = {}) {
    let where = {};
    if (query.userId) where.userId = query.userId.toString();
    const sessions = await prisma.deviceSession.findMany({ where });
    return sessions.map(formatSessionRecord);
  }

  async deleteOne(query = {}) {
    let where = {};
    if (query.userId && query.pushToken) {
      where.userId_pushToken = {
        userId: query.userId.toString(),
        pushToken: query.pushToken,
      };
      await prisma.deviceSession.delete({ where });
    }
  }
}

const DeviceSession = new DeviceSessionModel();
module.exports = DeviceSession;
