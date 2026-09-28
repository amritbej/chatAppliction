const path = require("path");
const fs = require("fs");
const multer = require("multer");
const LocalStorageAdapter = require("./localStorageAdapter");
const S3StorageAdapter = require("./s3StorageAdapter");
const CloudinaryStorageAdapter = require("./cloudinaryStorageAdapter");

const localAdapter = new LocalStorageAdapter();
const s3Adapter = new S3StorageAdapter();
const cloudinaryAdapter = new CloudinaryStorageAdapter();

const getStorageAdapter = () => {
  const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
  if (provider === "s3" && s3Adapter.isConfigured()) {
    return s3Adapter;
  }
  if (provider === "cloudinary" && cloudinaryAdapter.isConfigured()) {
    return cloudinaryAdapter;
  }
  return localAdapter;
};

// Multer storage for local disk
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `${Date.now()}_${safeName || "file"}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Basic file protection
    const blockedExts = [".exe", ".bat", ".cmd", ".sh", ".php", ".py", ".bin"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blockedExts.includes(ext)) {
      return cb(new Error("File type not allowed"), false);
    }
    cb(null, true);
  },
});

module.exports = {
  getStorageAdapter,
  upload,
};
