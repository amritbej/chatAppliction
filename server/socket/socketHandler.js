

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const Room = require("../models/Room");

const onlineUsers = new Map();
const activeRoomCalls = new Map();

const emitToUser = (io, userId, event, payload) => {
  if (!userId) return false;
  const targetSocketId = onlineUsers.get(userId.toString());
  if (targetSocketId) {
    io.to(targetSocketId).emit(event, payload);
    return true;
  }
  return false;
};

const getRoomCall = (roomId) => {
  if (!roomId) return null;
  const key = roomId.toString();
  if (!activeRoomCalls.has(key)) {
    activeRoomCalls.set(key, {
      callType: null,
      participants: new Map(),
    });
  }
  return activeRoomCalls.get(key);
};

const getPopulatedMessage = (messageId) =>
  Message.findById(messageId)
    .populate("sender", "username avatar")
    .populate("mentions", "username avatar")
    .populate({
      path: "replyTo",
      select: "content type fileName sender",
      populate: { path: "sender", select: "username avatar" },
    });

const formatSocketUser = (user) => ({
  _id: user._id,
  username: user.username,
  avatar: user.avatar,
  isOnline: user.isOnline,
  avatarVersion: Date.now(),
});

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error("No token");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select("-password");
      if (!socket.user) throw new Error("User not found");
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🟢 ${socket.user.username} connected`);

    onlineUsers.set(userId, socket.id);
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch (err) {
      console.error("Failed to mark user online:", err.message);
    }

    socket.broadcast.emit("user:online", userId);

    socket.on("room:join", (roomId) => {
      socket.join(roomId);
    });

    socket.on("room:leave", (roomId) => {
      socket.leave(roomId);
    });

    socket.on(
      "message:send",
      async ({
        roomId,
        content,
        type = "text",
        fileName,
        fileSize,
        mimeType,
        replyTo,
        mentions = [],
      }) => {
        try {
          const room = await Room.findById(roomId);
          if (!room) throw new Error("Room not found");

          const memberIds = room.members.map((id) => id.toString());
          if (!memberIds.includes(userId)) {
            throw new Error("You are not a member of this room");
          }

          const allowedTypes = ["text", "image", "file"];
          const messageType = allowedTypes.includes(type) ? type : "text";
          const trimmedContent =
            messageType === "text" ? content?.trim() : content;

          if (!trimmedContent) {
            throw new Error("Message cannot be empty");
          }

          if (messageType !== "text" && fileSize > 5 * 1024 * 1024) {
            throw new Error("Files must be 5MB or smaller");
          }

          let replyToId = null;
          if (replyTo) {
            const repliedMessage = await Message.findOne({
              _id: replyTo,
              room: roomId,
            }).select("_id");

            if (!repliedMessage) {
              throw new Error("Reply target was not found in this room");
            }

            replyToId = repliedMessage._id;
          }

          const mentionIds = [
            ...new Set(
              (Array.isArray(mentions) ? mentions : [])
                .map((id) => id?.toString())
                .filter((id) => id && memberIds.includes(id))
            ),
          ];

          const message = await Message.create({
            room: roomId,
            sender: userId,
            content: trimmedContent,
            type: messageType,
            fileName,
            fileSize,
            mimeType,
            replyTo: replyToId,
            mentions: mentionIds,
          });

          const populated = await getPopulatedMessage(message._id);

          await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

          io.to(roomId).emit("message:receive", populated);
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      }
    );

    socket.on("typing:start", ({ roomId }) => {
      socket.to(roomId).emit("typing:start", {
        userId,
        username: socket.user.username,
      });
    });

    socket.on("typing:stop", ({ roomId }) => {
      socket.to(roomId).emit("typing:stop", { userId });
    });

    socket.on("user:profile-updated", async () => {
      try {
        const user = await User.findById(userId).select("username avatar isOnline");
        if (!user) return;

        socket.user = user;
        io.emit("user:updated", formatSocketUser(user));
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("call:offer", ({ to, offer, callType }) => {
      if (!to || !offer) {
        socket.emit("error", { message: "Invalid call offer" });
        return;
      }

      emitToUser(io, to, "call:incoming", {
        from: userId,
        fromUsername: socket.user.username,
        offer,
        callType,
      });
    });

    socket.on("call:answer", ({ to, answer }) => {
      if (!to || !answer) {
        socket.emit("error", { message: "Invalid call answer" });
        return;
      }

      emitToUser(io, to, "call:answered", { answer });
    });

    socket.on("call:ice", ({ to, candidate }) => {
      if (!to || !candidate) return;
      emitToUser(io, to, "call:ice", { candidate });
    });

    socket.on("call:reject", ({ to }) => {
      if (!to) return;
      emitToUser(io, to, "call:rejected");
    });

    socket.on("call:end", ({ to }) => {
      if (!to) return;
      emitToUser(io, to, "call:ended");
    });

    socket.on("call:room:start", async ({ roomId, callType }) => {
      try {
        if (!roomId) throw new Error("Room id is required");
        const room = await Room.findById(roomId).populate(
          "members",
          "username avatar isOnline"
        );
        if (!room) throw new Error("Room not found");

        const memberIds = room.members.map((m) => m._id.toString());
        if (!memberIds.includes(userId)) throw new Error("Not a room member");
        if (memberIds.length > 15) {
          throw new Error("Room calls support at most 15 members");
        }

        socket.join(roomId);
        const roomCall = getRoomCall(roomId);
        if (!roomCall) throw new Error("Unable to start room call");
        roomCall.callType = callType;
        roomCall.participants.set(userId, {
          userId,
          username: socket.user.username,
        });

        room.members.forEach((member) => {
          const memberId = member._id.toString();
          if (memberId === userId) return;
          emitToUser(io, memberId, "call:incoming", {
            from: userId,
            fromUsername: socket.user.username,
            roomId,
            roomName: room.name || "Group call",
            callType,
          });
        });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("call:room:accept", async ({ roomId }) => {
      try {
        if (!roomId) throw new Error("Room id is required");
        const room = await Room.findById(roomId);
        if (!room) throw new Error("Room not found");
        const memberIds = room.members.map((id) => id.toString());
        if (!memberIds.includes(userId)) throw new Error("Not a room member");

        socket.join(roomId);
        const roomCall = getRoomCall(roomId);
        if (!roomCall) throw new Error("Room call is not active");
        const existingUsers = [...roomCall.participants.values()].filter(
          (participant) => participant.userId !== userId
        );

        roomCall.participants.set(userId, {
          userId,
          username: socket.user.username,
        });

        socket.emit("call:room:existing-users", {
          roomId,
          callType: roomCall.callType,
          users: existingUsers,
        });

        existingUsers.forEach((participant) => {
          emitToUser(io, participant.userId, "call:room:user-joined", {
            roomId,
            user: { userId, username: socket.user.username },
          });
        });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("call:room:offer", ({ roomId, to, offer, callType }) => {
      if (!roomId || !to || !offer) return;
      emitToUser(io, to, "call:room:offer", {
        roomId,
        from: userId,
        fromUsername: socket.user.username,
        offer,
        callType,
      });
    });

    socket.on("call:room:answer", ({ roomId, to, answer }) => {
      if (!roomId || !to || !answer) return;
      emitToUser(io, to, "call:room:answer", {
        roomId,
        from: userId,
        answer,
      });
    });

    socket.on("call:room:ice", ({ roomId, to, candidate }) => {
      if (!roomId || !to || !candidate) return;
      emitToUser(io, to, "call:room:ice", {
        roomId,
        from: userId,
        candidate,
      });
    });

    const leaveRoomCall = ({ roomId } = {}) => {
      if (!roomId) return;
      const roomCall = activeRoomCalls.get(roomId.toString());
      if (!roomCall) return;

      roomCall.participants.delete(userId);
      socket.to(roomId).emit("call:room:user-left", { roomId, userId });
      socket.leave(roomId);

      if (roomCall.participants.size === 0) {
        activeRoomCalls.delete(roomId.toString());
      }
    };

    socket.on("call:room:leave", leaveRoomCall);

    socket.on("call:room:reject", ({ roomId }) => {
      socket.leave(roomId);
    });

    socket.on("disconnect", async () => {
      activeRoomCalls.forEach((_roomCall, roomId) => {
        leaveRoomCall({ roomId });
      });
      console.log(`🔴 ${socket.user.username} disconnected`);
      onlineUsers.delete(userId);
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error("Failed to mark user offline:", err.message);
      }
      socket.broadcast.emit("user:offline", userId);
    });
  });
};

module.exports = { setupSocket };
