const bcrypt = require("bcryptjs");
const { prisma } = require("../config/db");

const formatUserRecord = (user) => {
  if (!user) return null;
  const clone = { ...user };
  clone._id = user.id; // Compatibility for frontend expecting _id

  // Parse JSON fields if stringified
  if (typeof clone.privacySettings === "string") {
    try {
      clone.privacySettings = JSON.parse(clone.privacySettings);
    } catch {
      clone.privacySettings = { lastSeenVisibility: "everyone", readReceipts: true };
    }
  }
  if (typeof clone.notificationSettings === "string") {
    try {
      clone.notificationSettings = JSON.parse(clone.notificationSettings);
    } catch {
      clone.notificationSettings = { messages: true, calls: true, payments: true };
    }
  }

  // Method to check password
  clone.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
  };

  // Method to save/update changes
  clone.save = async function () {
    const data = {
      username: this.username,
      displayName: this.displayName || "",
      bio: this.bio || "",
      phoneNumber: this.phoneNumber || "",
      email: this.email,
      googleId: this.googleId || null,
      authProvider: this.authProvider || "local",
      isEmailVerified: Boolean(this.isEmailVerified),
      emailVerificationOtpHash: this.emailVerificationOtpHash || null,
      emailVerificationOtpExpires: this.emailVerificationOtpExpires || null,
      passwordResetOtpHash: this.passwordResetOtpHash || null,
      passwordResetOtpExpires: this.passwordResetOtpExpires || null,
      avatar: this.avatar || "",
      isOnline: Boolean(this.isOnline),
      lastSeen: this.lastSeen || new Date(),
      privacySettings: this.privacySettings || { lastSeenVisibility: "everyone", readReceipts: true },
      notificationSettings: this.notificationSettings || { messages: true, calls: true, payments: true },
    };

    if (this.password) {
      if (this.password.startsWith("$2a$") || this.password.startsWith("$2b$")) {
        data.password = this.password;
      } else {
        data.password = await bcrypt.hash(this.password, 10);
      }
    }

    const updated = await prisma.user.update({
      where: { id: this.id },
      data,
    });
    Object.assign(this, formatUserRecord(updated));
    return this;
  };

  return clone;
};

class UserModel {
  findById(id) {
    const cleanId = id ? id.toString() : null;
    const chainable = {
      _id: cleanId,
      _selectPassword: true,
      select(fields) {
        if (typeof fields === "string" && fields.includes("-password")) {
          this._selectPassword = false;
        }
        return this;
      },
      then: async (resolve, reject) => {
        try {
          if (!chainable._id) return resolve(null);
          const user = await prisma.user.findUnique({
            where: { id: chainable._id },
          });
          if (!user) return resolve(null);
          const formatted = formatUserRecord(user);
          if (!chainable._selectPassword) delete formatted.password;
          resolve(formatted);
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  findOne(query = {}) {
    let where = {};

    if (query._id) {
      where.id = query._id.toString();
    } else if (query.id) {
      where.id = query.id.toString();
    }

    if (query.email) {
      where.email = query.email.toLowerCase();
    }

    if (query.authProvider) {
      where.authProvider = query.authProvider;
    }

    if (query.username) {
      if (typeof query.username === "object" && query.username.$regex) {
        where.username = { contains: query.username.$regex, mode: "insensitive" };
      } else {
        where.username = query.username;
      }
    }

    if (query.googleId) {
      where.googleId = query.googleId;
    }

    if (query.$or && Array.isArray(query.$or)) {
      where.OR = query.$or.map((cond) => {
        const item = {};
        if (cond.email) item.email = cond.email.toLowerCase();
        if (cond.username) item.username = cond.username;
        if (cond.googleId) item.googleId = cond.googleId;
        return item;
      });
    }

    if (query._id && query._id.$ne) {
      where.id = { not: query._id.$ne.toString() };
    }

    const chainable = {
      _where: where,
      select() {
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const user = await prisma.user.findFirst({ where: chainable._where });
          resolve(formatUserRecord(user));
        } catch (err) {
          reject(err);
        }
      },
    };
    return chainable;
  }

  find(query = {}) {
    let where = {};
    let take = undefined;
    let orderBy = [{ isOnline: "desc" }, { username: "asc" }];

    if (query._id && query._id.$ne) {
      where.id = { not: query._id.$ne.toString() };
    }

    if (query.username) {
      if (typeof query.username === "object" && query.username.$regex) {
        where.username = { contains: query.username.$regex, mode: "insensitive" };
      } else {
        where.username = query.username;
      }
    }

    if (query.$or) {
      where.OR = query.$or.map((cond) => {
        const item = {};
        if (cond.username && cond.username.$regex) {
          item.username = { contains: cond.username.$regex, mode: "insensitive" };
        }
        if (cond.displayName && cond.displayName.$regex) {
          item.displayName = { contains: cond.displayName.$regex, mode: "insensitive" };
        }
        return item;
      });
    }

    const chainable = {
      _where: where,
      _orderBy: orderBy,
      _take: take,
      _selectPassword: false,
      select(fields) {
        if (typeof fields === "string" && !fields.includes("-password")) {
          this._selectPassword = true;
        }
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
          const users = await prisma.user.findMany({
            where: chainable._where,
            orderBy: chainable._orderBy,
            take: chainable._take,
          });
          const formatted = users.map((u) => {
            const f = formatUserRecord(u);
            if (!chainable._selectPassword) delete f.password;
            return f;
          });
          resolve(formatted);
        } catch (err) {
          reject(err);
        }
      },
    };

    return chainable;
  }

  async create(data) {
    let passwordHash = data.password;
    if (passwordHash) {
      if (!passwordHash.startsWith("$2a$") && !passwordHash.startsWith("$2b$")) {
        passwordHash = await bcrypt.hash(passwordHash, 10);
      }
    }

    const created = await prisma.user.create({
      data: {
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        password: passwordHash || null,
        displayName: data.displayName || "",
        bio: data.bio || "",
        phoneNumber: data.phoneNumber || "",
        googleId: data.googleId || null,
        authProvider: data.authProvider || "local",
        isEmailVerified: data.isEmailVerified || false,
        emailVerificationOtpHash: data.emailVerificationOtpHash || null,
        emailVerificationOtpExpires: data.emailVerificationOtpExpires || null,
        passwordResetOtpHash: data.passwordResetOtpHash || null,
        passwordResetOtpExpires: data.passwordResetOtpExpires || null,
        avatar: data.avatar || "",
        isOnline: data.isOnline || false,
        privacySettings: data.privacySettings || {
          lastSeenVisibility: "everyone",
          readReceipts: true,
        },
        notificationSettings: data.notificationSettings || {
          messages: true,
          calls: true,
          payments: true,
        },
      },
    });

    return formatUserRecord(created);
  }

  async findByIdAndUpdate(id, updates = {}, options = {}) {
    if (!id) return null;
    const cleanId = id.toString();
    const data = {};

    if (updates.username !== undefined) data.username = updates.username.trim();
    if (updates.displayName !== undefined) data.displayName = updates.displayName.trim();
    if (updates.bio !== undefined) data.bio = updates.bio.trim();
    if (updates.phoneNumber !== undefined) data.phoneNumber = updates.phoneNumber.trim();
    if (updates.avatar !== undefined) data.avatar = updates.avatar.trim();
    if (updates.isOnline !== undefined) data.isOnline = Boolean(updates.isOnline);
    if (updates.lastSeen !== undefined) data.lastSeen = new Date(updates.lastSeen);
    if (updates.isEmailVerified !== undefined) data.isEmailVerified = Boolean(updates.isEmailVerified);
    if (updates.emailVerificationOtpHash !== undefined) data.emailVerificationOtpHash = updates.emailVerificationOtpHash;
    if (updates.emailVerificationOtpExpires !== undefined) data.emailVerificationOtpExpires = updates.emailVerificationOtpExpires;
    if (updates.passwordResetOtpHash !== undefined) data.passwordResetOtpHash = updates.passwordResetOtpHash;
    if (updates.passwordResetOtpExpires !== undefined) data.passwordResetOtpExpires = updates.passwordResetOtpExpires;
    if (updates.privacySettings !== undefined) data.privacySettings = updates.privacySettings;
    if (updates.notificationSettings !== undefined) data.notificationSettings = updates.notificationSettings;

    if (updates.password) {
      if (updates.password.startsWith("$2a$") || updates.password.startsWith("$2b$")) {
        data.password = updates.password;
      } else {
        data.password = await bcrypt.hash(updates.password, 10);
      }
    }

    const updated = await prisma.user.update({
      where: { id: cleanId },
      data,
    });

    return formatUserRecord(updated);
  }

  async exists(query = {}) {
    let where = {};
    if (query.username) where.username = query.username;
    if (query.email) where.email = query.email.toLowerCase();
    if (query._id) where.id = query._id.toString();
    const count = await prisma.user.count({ where });
    return count > 0;
  }
}

const User = new UserModel();
module.exports = User;
