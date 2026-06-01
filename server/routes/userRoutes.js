const express = require("express");
const {
  getUsers,
  searchUsers,
  updateProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", protect, getUsers);
router.get("/search", protect, searchUsers);
router.patch("/me", protect, updateProfile);

module.exports = router;
