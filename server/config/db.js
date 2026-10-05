const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

let prismaInstance = null;

const getPrisma = () => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return prismaInstance;
};

const connectDB = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ Fatal Error: DATABASE_URL environment variable is not defined!");
    console.error("👉 If running on Render:");
    console.error("   1. Create a PostgreSQL database in your Render dashboard (it is free).");
    console.error("   2. Copy the 'Internal Database URL' from your Render PostgreSQL instance.");
    console.error("   3. Go to your Web Service -> Environment -> add DATABASE_URL=<copied-url>");
    console.error("👉 If running locally:");
    console.error("   Add DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatapp in server/.env");
    process.exit(1);
  }

  const prisma = getPrisma();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ PostgreSQL connected successfully via Prisma");
    return prisma;
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  }
};

const prisma = getPrisma();

module.exports = {
  connectDB,
  getPrisma,
  prisma,
};
