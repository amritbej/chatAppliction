// routes/roomRoutes.js
const express = require("express");
const { getOrCreateRoom, getMyRooms } = require("../controllers/roomController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", protect, getMyRooms);
router.post("/", protect, getOrCreateRoom);

module.exports = router;
