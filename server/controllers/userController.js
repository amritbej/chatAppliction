
const User = require("../models/User");
const { formatUser } = require("./authController");

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("-password") 
      .sort({ isOnline: -1, username: 1 }); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const users = await User.find({
      username: { $regex: q, $options: "i" }, 
      _id: { $ne: req.user._id },
    })
      .select("-password")
      .limit(20);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};

    if (typeof username === "string") {
      const nextUsername = username.trim();
      if (nextUsername.length < 3 || nextUsername.length > 24) {
        return res
          .status(400)
          .json({ message: "Username must be 3 to 24 characters" });
      }

      const exists = await User.findOne({
        username: nextUsername,
        _id: { $ne: req.user._id },
      });

      if (exists) {
        return res.status(400).json({ message: "Username already taken" });
      }

      updates.username = nextUsername;
    }

    if (typeof avatar === "string") {
      if (avatar && avatar.length > 2 * 1024 * 1024) {
        return res.status(400).json({ message: "Profile photo is too large" });
      }
      updates.avatar = avatar.trim();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, searchUsers, updateProfile };
