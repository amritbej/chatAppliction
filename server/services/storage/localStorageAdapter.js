const path = require("path");
const fs = require("fs");
const StorageAdapter = require("./storageAdapter");

class LocalStorageAdapter extends StorageAdapter {
  constructor() {
    super("local");
    this.uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file) {
    // Multer diskStorage puts the file in uploadDir
    const filename = file.filename || path.basename(file.path);
    const serverUrl = process.env.SERVER_URL || "http://localhost:5000";
    const fileUrl = `${serverUrl}/uploads/${filename}`;

    return {
      key: filename,
      url: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(key) {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  getFileUrl(key) {
    const serverUrl = process.env.SERVER_URL || "http://localhost:5000";
    return `${serverUrl}/uploads/${key}`;
  }
}

module.exports = LocalStorageAdapter;
