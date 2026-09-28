/**
 * Base Storage Adapter interface.
 */
class StorageAdapter {
  constructor(name) {
    this.name = name;
  }

  async uploadFile(_file) {
    throw new Error("uploadFile() must be implemented by storage adapter");
  }

  async deleteFile(_key) {
    throw new Error("deleteFile() must be implemented by storage adapter");
  }

  getFileUrl(_key) {
    throw new Error("getFileUrl() must be implemented by storage adapter");
  }
}

module.exports = StorageAdapter;
