const Room = require("../models/Room");

const MAX_ROOM_MEMBERS = 15;

const getOrCreateRoom = async (req, res) => {
  try {
    const { userId, userIds = [], name } = req.body;
    const myId = req.user._id;

    if (Array.isArray(userIds) && userIds.length > 0) {
      const memberIds = [...new Set([myId.toString(), ...userIds])];

      if (memberIds.length < 2) {
        return res.status(400).json({ message: "Select at least one member" });
      }

      if (memberIds.length > MAX_ROOM_MEMBERS) {
        return res
          .status(400)
          .json({ message: `Rooms can have at most ${MAX_ROOM_MEMBERS} members` });
      }

      let room = await Room.create({
        name: name?.trim() || "Group chat",
        members: memberIds,
        isGroup: true,
      });
      room = await room.populate("members", "username avatar isOnline");
      return res.json(room);
    }

    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    let room = await Room.findOne({
      isGroup: false,
      members: { $all: [myId, userId], $size: 2 },
    }).populate("members", "username avatar isOnline");

    if (!room) {
      room = await Room.create({ members: [myId, userId], isGroup: false });
      room = await room.populate("members", "username avatar isOnline");
    }

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate("members", "username avatar isOnline")
      .populate({
        path: "lastMessage",
        populate: [
          { path: "sender", select: "username avatar" },
          { path: "mentions", select: "username avatar" },
        ],
      })
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getOrCreateRoom, getMyRooms };
