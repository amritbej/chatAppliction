const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ Fatal Error: MONGO_URI environment variable is not defined!");
    console.error("👉 If running on Render, go to your Web Service -> Environment -> add MONGO_URI.");
    console.error("👉 If running locally, check that your server/.env file contains MONGO_URI.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    if (err.message.includes("whitelist") || err.message.includes("querySrv") || err.message.includes("ETIMEOUT")) {
      console.error("👉 Please ensure MongoDB Atlas -> Network Access allows 0.0.0.0/0 (all IPs) for Render.");
    }
    process.exit(1); 
  }
};

module.exports = connectDB;
