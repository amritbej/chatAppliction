
const Message = require("../models/Message");
const Room = require("../models/Room");

const getMessages = async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      members: req.user._id,
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "username avatar") 
      .populate("mentions", "username avatar")
      .populate({
        path: "replyTo",
        select: "content type fileName sender",
        populate: { path: "sender", select: "username avatar" },
      })
      .sort({ createdAt: 1 }) 
      .limit(100); 
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMessages };
