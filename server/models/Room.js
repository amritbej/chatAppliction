

const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true, 
    },
    isGroup: {
      type: Boolean,
      default: false
      },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

roomSchema.path("members").validate(function (members) {
  return members.length <= 15;
}, "Rooms can have at most 15 members");

module.exports = mongoose.model("Room", roomSchema);
