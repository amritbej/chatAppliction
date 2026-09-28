const mongoose = require("mongoose");

const deviceSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pushToken: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown",
    },
    deviceInfo: {
      type: String,
      default: "",
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

deviceSessionSchema.index({ userId: 1, pushToken: 1 }, { unique: true });

module.exports = mongoose.model("DeviceSession", deviceSessionSchema);
