// index.js — Main entry point for the server
// This file starts Express + Socket.IO and connects to MongoDB

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const connectDB = require("./config/db");
const { configurePassport } = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const roomRoutes = require("./routes/roomRoutes");
const { setupSocket } = require("./socket/socketHandler");

const app = express();
configurePassport();

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
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

// ─── REST API Routes ─────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);       // Login, Register
app.use("/api/users", userRoutes);      // Get users, search users
app.use("/api/messages", messageRoutes); // Get chat history
app.use("/api/rooms", roomRoutes);       // Create / get chat rooms

// ─── HTTP Server (required for Socket.IO) ───────────────────────────────────
const server = http.createServer(app);

// ─── Socket.IO Setup ─────────────────────────────────────────────────────────
// Socket.IO wraps the HTTP server so WebSockets work on the same port
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

// All socket events are in a separate file to keep this clean
setupSocket(io);

// ─── Start Server ─────────────────────────────────────────────────────────────

// Serve React Frontend
const path = require("path");
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
});
