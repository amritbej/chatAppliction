const { prisma } = require("../config/db");

const formatNotificationRecord = (item) => {
  if (!item) return null;
  const clone = { ...item };
  clone._id = item.id;
  clone.user = item.userId;
  return clone;
};

class NotificationModel {
  async create(data) {
    const userId = data.user ? data.user.toString() : data.userId;
    const created = await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || {},
        isRead: Boolean(data.isRead),
      },
    });
    return formatNotificationRecord(created);
  }

  find(query = {}) {
    let where = {};
    if (query.user) where.userId = query.user.toString();
    if (query.isRead !== undefined) where.isRead = Boolean(query.isRead);

    const chainable = {
      _where: where,
      _orderBy: [{ createdAt: "desc" }],
      _take: 50,
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
          const items = await prisma.notification.findMany({
            where: chainable._where,
            orderBy: chainable._orderBy,
            take: chainable._take,
          });
          resolve(items.map(formatNotificationRecord));
        } catch (err) {
          reject(err);
        }
      },
    };

    return chainable;
  }

  async findByIdAndUpdate(id, updates = {}) {
    if (!id) return null;
    const data = {};
    if (updates.isRead !== undefined) data.isRead = Boolean(updates.isRead);

    const updated = await prisma.notification.update({
      where: { id: id.toString() },
      data,
    });
    return formatNotificationRecord(updated);
  }
}

const Notification = new NotificationModel();
module.exports = Notification;
