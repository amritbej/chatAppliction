const StorageAdapter = require("./storageAdapter");

class CloudinaryStorageAdapter extends StorageAdapter {
  constructor() {
    super("cloudinary");
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  }

  isConfigured() {
    return Boolean(
      this.cloudName &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  async uploadFile(file) {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary credentials not configured");
    }
    const publicId = `chat_${Date.now()}`;
    const url = `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`;
    return {
      key: publicId,
      url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(_key) {
    return true;
  }

  getFileUrl(key) {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${key}`;
  }
}

module.exports = CloudinaryStorageAdapter;
