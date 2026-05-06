const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const formatUser = (user, token) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  authProvider: user.authProvider,
  ...(token ? { token } : {}),
});

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

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

    res.status(201).json(formatUser(user, generateToken(user._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.trim().toLowerCase() }).select(
      "+password"
    );
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

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

module.exports = { register, login, getMe, googleCallback, generateToken, formatUser };
