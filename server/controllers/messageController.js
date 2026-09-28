const Message = require("../models/Message");
const Room = require("../models/Room");
const { getStorageAdapter } = require("../services/storage");
const { AppError } = require("../middleware/errorHandler");

let ioInstance = null;
const setSocketIO = (io) => {
  ioInstance = io;
};

const populateMessageQuery = (query) =>
  query
    .populate("sender", "username avatar")
    .populate("mentions", "username avatar")
    .populate({
      path: "replyTo",
      select: "content type fileName sender",
      populate: { path: "sender", select: "username avatar" },
    })
    .populate("reactions.user", "username avatar");

/**
 * Get paginated messages for a room.
 */
const getMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    const room = await Room.findOne({
      _id: roomId,
      members: req.user._id,
    });

    if (!room) {
      return next(new AppError("Room not found", 404, "ROOM_NOT_FOUND"));
    }

    const query = {
      room: roomId,
      deletedFor: { $ne: req.user._id },
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const messages = await populateMessageQuery(
      Message.find(query).sort({ createdAt: -1 }).limit(limitNum)
    );

    // Return in chronological order
    res.json(messages.reverse());
  } catch (err) {
    next(err);
  }
};

/**
 * Upload an attachment via multipart/form-data.
 */
const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError("No file uploaded", 400, "MISSING_FILE"));
    }

    const storage = getStorageAdapter();
    const result = await storage.uploadFile(req.file);

    res.status(201).json({
      success: true,
      data: result,
      message: "File uploaded successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Edit an existing text message.
 */
const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return next(new AppError("Message content cannot be empty", 400, "EMPTY_MESSAGE"));
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return next(new AppError("Message not found", 404, "MESSAGE_NOT_FOUND"));
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return next(new AppError("Cannot edit another user's message", 403, "UNAUTHORIZED_EDIT"));
    }

    if (message.type === "payment") {
      return next(new AppError("Payment messages cannot be edited", 400, "CANNOT_EDIT_PAYMENT"));
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await populateMessageQuery(Message.findById(message._id));

    if (ioInstance) {
      ioInstance.to(message.room.toString()).emit("message:edited", populated);
    }

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a message (for me OR for everyone).
 */
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { mode = "for_me" } = req.body; // "for_me" or "for_everyone"

    const message = await Message.findById(messageId);
    if (!message) {
      return next(new AppError("Message not found", 404, "MESSAGE_NOT_FOUND"));
    }

    if (mode === "for_everyone") {
      if (message.sender.toString() !== req.user._id.toString()) {
        return next(
          new AppError("Cannot delete for everyone on another user's message", 403, "UNAUTHORIZED_DELETE")
        );
      }
      message.isDeleted = true;
      message.content = "This message was deleted";
      await message.save();

      if (ioInstance) {
        ioInstance.to(message.room.toString()).emit("message:deleted", {
          messageId: message._id,
          roomId: message.room,
          mode: "for_everyone",
        });
      }
    } else {
      // Delete for me
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }
    }

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle emoji reaction on a message.
 */
const reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return next(new AppError("Emoji is required", 400, "MISSING_EMOJI"));
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return next(new AppError("Message not found", 404, "MESSAGE_NOT_FOUND"));
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Toggle off
      message.reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();
    const populated = await populateMessageQuery(Message.findById(message._id));

    if (ioInstance) {
      ioInstance.to(message.room.toString()).emit("message:reaction", {
        messageId: message._id,
        roomId: message.room,
        reactions: populated.reactions,
      });
    }

    res.json({ success: true, data: populated.reactions });
  } catch (err) {
    next(err);
  }
};

/**
 * Pin or unpin a message.
 */
const togglePinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return next(new AppError("Message not found", 404, "MESSAGE_NOT_FOUND"));
    }

    message.isPinned = !message.isPinned;
    message.pinnedAt = message.isPinned ? new Date() : null;
    await message.save();

    if (ioInstance) {
      ioInstance.to(message.room.toString()).emit("message:pinned", {
        messageId: message._id,
        roomId: message.room,
        isPinned: message.isPinned,
      });
    }

    res.json({ success: true, isPinned: message.isPinned });
  } catch (err) {
    next(err);
  }
};

/**
 * Search messages across user's chat rooms.
 */
const searchMessages = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json([]);
    }

    const myRooms = await Room.find({ members: req.user._id }).select("_id");
    const roomIds = myRooms.map((r) => r._id);

    const messages = await populateMessageQuery(
      Message.find({
        room: { $in: roomIds },
        content: { $regex: q.trim(), $options: "i" },
        isDeleted: false,
        deletedFor: { $ne: req.user._id },
      })
        .sort({ createdAt: -1 })
        .limit(30)
    );

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

/**
 * Forward a message to another room.
 */
const forwardMessage = async (req, res, next) => {
  try {
    const { messageId, targetRoomId } = req.body;

    const original = await Message.findById(messageId);
    if (!original) {
      return next(new AppError("Original message not found", 404, "MESSAGE_NOT_FOUND"));
    }

    const targetRoom = await Room.findOne({
      _id: targetRoomId,
      members: req.user._id,
    });
    if (!targetRoom) {
      return next(new AppError("Target room not found or not a member", 404, "ROOM_NOT_FOUND"));
    }

    const forwarded = await Message.create({
      room: targetRoomId,
      sender: req.user._id,
      content: original.content,
      type: original.type === "payment" ? "text" : original.type,
      fileName: original.fileName,
      fileSize: original.fileSize,
      mimeType: original.mimeType,
      fileUrl: original.fileUrl,
    });

    await Room.findByIdAndUpdate(targetRoomId, { lastMessage: forwarded._id });
    const populated = await populateMessageQuery(Message.findById(forwarded._id));

    if (ioInstance) {
      ioInstance.to(targetRoomId.toString()).emit("message:receive", populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMessages,
  uploadAttachment,
  editMessage,
  deleteMessage,
  reactToMessage,
  togglePinMessage,
  searchMessages,
  forwardMessage,
  setSocketIO,
};
