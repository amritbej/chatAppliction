const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isValidEmail } = require("../utils/validators");
const {
  createOtp,
  isOtpExpired,
  matchesOtp,
  setOtpFields,
} = require("../utils/otp");
const { sendOtpEmail } = require("../utils/mailer");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const formatUser = (user, token) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  authProvider: user.authProvider,
  isEmailVerified: user.isEmailVerified,
  ...(token ? { token } : {}),
});

const sendVerificationOtp = async (user) => {
  const otp = createOtp();
  setOtpFields(
    user,
    "emailVerificationOtpHash",
    "emailVerificationOtpExpires",
    otp
  );
  await user.save();
  await sendOtpEmail({
    to: user.email,
    subject: "Verify your ChatApp email",
    otp,
    purpose: "email verification",
  });
};

const sendPasswordResetOtp = async (user) => {
  const otp = createOtp();
  setOtpFields(user, "passwordResetOtpHash", "passwordResetOtpExpires", otp);
  await user.save();
  await sendOtpEmail({
    to: user.email,
    subject: "Reset your ChatApp password",
    otp,
    purpose: "password reset",
  });
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const exists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });
    if (exists) {
      return res.status(400).json({ message: "Username or email already taken" });
    }

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      authProvider: "local",
    });

    await sendVerificationOtp(user);

    res.status(201).json({
      message: "Verification OTP sent to your email",
      email: user.email,
      requiresVerification: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.authProvider === "local" && !user.isEmailVerified) {
      await sendVerificationOtp(user);
      return res.status(403).json({
        message: "Please verify your email. We sent a new OTP.",
        email: user.email,
        requiresVerification: true,
      });
    }

    res.json(formatUser(user, generateToken(user._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail) || !otp?.trim()) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+emailVerificationOtpHash"
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.isEmailVerified) {
      return res.json(formatUser(user, generateToken(user._id)));
    }

    if (
      isOtpExpired(user.emailVerificationOtpExpires) ||
      !matchesOtp(otp.trim(), user.emailVerificationOtpHash)
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isEmailVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationOtpExpires = undefined;
    await user.save();

    res.json(formatUser(user, generateToken(user._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (user.isEmailVerified) {
      return res.json({ message: "Email is already verified" });
    }

    await sendVerificationOtp(user);
    res.json({ message: "Verification OTP sent to your email", email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      authProvider: "local",
    });

    if (user) {
      await sendPasswordResetOtp(user);
    }

    res.json({
      message: "If that email exists, a password reset OTP has been sent.",
      email: normalizedEmail,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail) || !otp?.trim() || !password) {
      return res.status(400).json({ message: "Email, OTP, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      authProvider: "local",
    }).select("+passwordResetOtpHash");

    if (
      !user ||
      isOtpExpired(user.passwordResetOtpExpires) ||
      !matchesOtp(otp.trim(), user.passwordResetOtpHash)
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = password;
    user.passwordResetOtpHash = undefined;
    user.passwordResetOtpExpires = undefined;
    user.isEmailVerified = true;
    await user.save();

    res.json(formatUser(user, generateToken(user._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  res.json(formatUser(req.user));
};

const googleCallback = (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
  }

  const token = generateToken(req.user._id);
  const params = new URLSearchParams({ token });
  res.redirect(`${process.env.CLIENT_URL}/oauth/callback?${params.toString()}`);
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
  getMe,
  googleCallback,
  generateToken,
  formatUser,
};
