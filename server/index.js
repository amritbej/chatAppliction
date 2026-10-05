require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const passport = require("passport");

const { connectDB, prisma } = require("./config/db");
const { configurePassport } = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const roomRoutes = require("./routes/roomRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { setupSocket } = require("./socket/socketHandler");
const { errorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

const app = express();
configurePassport();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:19006",
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map((origin) => origin.trim().replace(/\/$/, ""));

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    return callback(null, true);
  }
  return callback(new Error("Not allowed by CORS"));
};

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Request ID and logging
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors({ origin: corsOrigin, credentials: true }));

// Raw body preservation for webhook signature verification
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for media uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "fallback_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(passport.initialize());

// Health Check
app.get("/health", async (req, res) => {
  let isDbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
  } catch {
    isDbConnected = false;
  }

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? "ok" : "degraded",
    database: isDbConnected ? "connected" : "disconnected",
    databaseEngine: "postgresql",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Apply rate limiter to general API
app.use("/api", apiLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

// Centralized error handling
app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

setupSocket(io);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Database connection failed:", err);
      process.exit(1);
    });
}

module.exports = { app, server };
