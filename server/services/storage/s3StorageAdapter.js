const StorageAdapter = require("./storageAdapter");

class S3StorageAdapter extends StorageAdapter {
  constructor() {
    super("s3");
    this.bucket = process.env.S3_BUCKET;
    this.region = process.env.S3_REGION || "us-east-1";
  }

  isConfigured() {
    return Boolean(this.bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
  }

  async uploadFile(file) {
    if (!this.isConfigured()) {
      throw new Error("S3 storage credentials not configured");
    }
    const key = `uploads/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return {
      key,
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
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

module.exports = S3StorageAdapter;
