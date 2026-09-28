const mongoose = require("mongoose");

const blockedUserSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    blockedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

blockedUserSchema.index({ user: 1, blockedUser: 1 }, { unique: true });

module.exports = mongoose.model("BlockedUser", blockedUserSchema);
