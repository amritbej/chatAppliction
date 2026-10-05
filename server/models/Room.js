const { prisma } = require("../config/db");

const formatRoomRecord = async (room) => {
  if (!room) return null;
  const clone = { ...room };
  clone._id = room.id;

  // Format members
  if (room.members && Array.isArray(room.members)) {
    clone.members = room.members.map((m) => {
      const u = m.user || m;
      return {
        _id: u.id || u._id,
        id: u.id || u._id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
        toString() {
          return this.id || this._id;
        },
      };
    });
  }

  // Format lastMessage if present
  if (room.lastMessageId && !clone.lastMessage) {
    try {
      const msg = await prisma.message.findUnique({
        where: { id: room.lastMessageId },
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
        },
      });
      if (msg) {
        clone.lastMessage = {
          _id: msg.id,
          id: msg.id,
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt,
          sender: msg.sender ? {
            _id: msg.sender.id,
            id: msg.sender.id,
            username: msg.sender.username,
            avatar: msg.sender.avatar,
            toString() {
              return this.id;
            },
          } : null,
        };
      }
    } catch {
      // Ignored
    }
  }

  // Chainable populate compatibility
  clone.populate = async function () {
    return this;
  };

  return clone;
};

class RoomModel {
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
          const room = await prisma.room.findUnique({
            where: { id: chainable._id },
            include: {
              members: { include: { user: true } },
            },
          });
          resolve(await formatRoomRecord(room));
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  findOne(query = {}) {
    const chainable = {
      _query: query,
      populate() {
        return this;
      },
      then: async (resolve, reject) => {
        try {
          if (chainable._query._id) {
            const r = await prisma.room.findUnique({
              where: { id: chainable._query._id.toString() },
              include: { members: { include: { user: true } } },
            });
            return resolve(await formatRoomRecord(r));
          }

          if (chainable._query.isGroup === false && chainable._query.members?.$all) {
            const [userA, userB] = chainable._query.members.$all.map((id) => id.toString());
            const rooms = await prisma.room.findMany({
              where: {
                isGroup: false,
                AND: [
                  { members: { some: { userId: userA } } },
                  { members: { some: { userId: userB } } },
                ],
              },
              include: {
                members: { include: { user: true } },
              },
            });

            const match = rooms.find((r) => r.members.length === 2);
            return resolve(await formatRoomRecord(match));
          }

          const room = await prisma.room.findFirst({
            include: {
              members: { include: { user: true } },
            },
          });
          return resolve(await formatRoomRecord(room));
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  find(query = {}) {
    let where = {};

    if (query.members) {
      const userId = query.members.toString();
      where.members = { some: { userId } };
    }

    const chainable = {
      _where: where,
      _orderBy: [{ updatedAt: "desc" }],
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
      then: async (resolve, reject) => {
        try {
          const rooms = await prisma.room.findMany({
            where: chainable._where,
            include: {
              members: { include: { user: true } },
            },
            orderBy: chainable._orderBy,
          });

          const formatted = await Promise.all(rooms.map(formatRoomRecord));
          resolve(formatted);
        } catch (err) {
          reject(err);
        }
      },
    };

    return chainable;
  }

  async create(data) {
    const memberIds = (data.members || []).map((id) => id.toString());
    const room = await prisma.room.create({
      data: {
        name: data.name || (data.isGroup ? "Group chat" : null),
        isGroup: Boolean(data.isGroup),
        members: {
          create: memberIds.map((userId) => ({ userId })),
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });

    return formatRoomRecord(room);
  }

  async findByIdAndUpdate(id, updates = {}) {
    if (!id) return null;
    const cleanId = id.toString();
    const data = {};

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.lastMessage !== undefined) {
      data.lastMessageId = updates.lastMessage ? updates.lastMessage.toString() : null;
    }
    if (updates.lastMessageId !== undefined) {
      data.lastMessageId = updates.lastMessageId;
    }

    const updated = await prisma.room.update({
      where: { id: cleanId },
      data,
      include: {
        members: { include: { user: true } },
      },
    });

    return formatRoomRecord(updated);
  }
}

const Room = new RoomModel();
module.exports = Room;
