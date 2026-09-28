const Room = require("../models/Room");
const { AppError } = require("./errorHandler");

/**
 * Ensures the authenticated user is a participant of the specified room ID.
 */
const requireRoomMember = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.body.roomId;
    if (!roomId) {
      return next(new AppError("Room ID is required", 400, "MISSING_ROOM_ID"));
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return next(new AppError("Room not found", 404, "ROOM_NOT_FOUND"));
    }

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(
        new AppError("You are not a member of this room", 403, "NOT_ROOM_MEMBER")
      );
    }

    req.room = room;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireRoomMember };
