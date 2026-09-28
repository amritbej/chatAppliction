const express = require("express");
const {
  getMessages,
  uploadAttachment,
  editMessage,
  deleteMessage,
  reactToMessage,
  togglePinMessage,
  searchMessages,
  forwardMessage,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../services/storage");
const router = express.Router();

router.get("/search", protect, searchMessages);
router.post("/upload", protect, upload.single("file"), uploadAttachment);
router.post("/forward", protect, forwardMessage);
router.get("/:roomId", protect, getMessages);
router.patch("/:messageId", protect, editMessage);
router.delete("/:messageId", protect, deleteMessage);
router.post("/:messageId/react", protect, reactToMessage);
router.post("/:messageId/pin", protect, togglePinMessage);

module.exports = router;
