
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { isValidEmail } = require("../utils/validators");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,       
      trim: true,      
      minlength: 3,
      maxlength: 24,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: isValidEmail,
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOtpHash: {
      type: String,
      select: false,
    },
    emailVerificationOtpExpires: Date,
    passwordResetOtpHash: {
      type: String,
      select: false,
    },
    passwordResetOtpExpires: Date,
    avatar: {
      type: String,
      default: "", 
    },
    isOnline: {
      type: Boolean,
      default: false, 
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } 
);


userSchema.pre("save", async function (next) {
  
  if (!this.password || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
