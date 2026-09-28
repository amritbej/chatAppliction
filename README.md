# ChatApp + Payments (Cross-Platform Communication & Financial Suite)

A production-grade, full-stack, cross-platform communication and peer-to-peer (P2P) payments application. ChatApp combines real-time messaging, encrypted WebRTC voice/video calls, and seamless financial transactions directly inside chat rooms.

---

## 🚀 Key Capabilities

### 💬 Real-Time Messaging & Chat
* **Instant Delivery:** Sub-second Socket.IO message broadcasting.
* **In-Chat P2P Payments:** Send money directly to contacts within any chat with live status updates.
* **Rich Interactions:** Message emoji reactions (❤️, 👍, 😂, 🔥), swipe-to-reply, mentions tracking (`@username`), editing, pinning, and message deletion (for me / for everyone).
* **Media & File Sharing:** Modular storage adapter (Local disk, AWS S3, Cloudinary) handling multipart uploads instead of base64 over websockets.
* **Presence & Activity:** Live online/offline status indicators, last seen timestamps, and typing indicators.

### 💳 Secure In-Chat Payments (Razorpay Sandbox & Provider Abstraction)
* **Never Trust Client Success:** All transactions undergo server-side HMAC-SHA256 signature verification or webhook confirmation before being marked `success`.
* **Integer Minor Currency Units:** Financial amounts are strictly stored in minor units (paise for INR, e.g. ₹500 = `50000`) eliminating floating-point rounding bugs.
* **Transaction State Machine:** Explicit transitions: `created` → `pending` → `processing` → `success` / `failed` / `cancelled` / `refunded`.
* **Idempotency & Replay Protection:** Enforces idempotency keys and database uniqueness on `providerOrderId` and `providerPaymentId`.
* **Wallet / Transaction History:** Filter by sent, received, or all transactions with aggregate statistics.

### 📞 WebRTC Audio & Video Calling
* Peer-to-peer direct audio/video calling.
* Group calls for up to 15 members in chat rooms.
* Socket.IO-based signaling server with STUN configuration.

### 🔐 Security & Hardened Architecture
* **Helmet HTTP Security Headers** & CORS restriction policy.
* **Granular Rate Limiters:** Distinct rate windows for general API endpoints, authentication, and financial operations.
* **Password Hashing & OTP:** Bcrypt.js with salt work factor of 10 and timed SHA-256 hashed OTPs.
* **Centralized Error Handling:** Consistent `{ success, data, error: { code, message } }` envelopes without internal stack traces in production.
* **Health Check Endpoint:** `GET /health` monitoring database connectivity, uptime, and server health.

---

## 📱 Cross-Platform Support

| Platform | Technology | Directory |
| :--- | :--- | :--- |
| **Backend API & Sockets** | Node.js, Express, MongoDB, Socket.IO, Razorpay | `server/` |
| **Web Client** | React 18, Vite, Tailwind CSS | `client/` |
| **Mobile App (Android/iOS/Web)** | React Native, Expo SDK 52, Expo Router, TypeScript | `mobile/` |

---

## 🛠️ Directory Structure

```text
├── client/                     # Vite + React web application
│   ├── src/
│   │   ├── components/         # ChatWindow, Sidebar, MessageBubble, CallModal, PaymentModals
│   │   ├── context/            # AuthContext, SocketContext
│   │   ├── hooks/              # useWebRTC
│   │   └── pages/              # ChatPage, LoginPage, RegisterPage, VerifyEmailPage
│   └── package.json
│
├── mobile/                     # React Native / Expo cross-platform mobile application
│   ├── app/                    # Expo Router file-based screens
│   │   ├── (auth)/             # login, register, verify-email, forgot-password
│   │   ├── (tabs)/             # chats, payments, people, settings
│   │   ├── chat/[roomId].tsx   # Real-time chat & payment bubble screen
│   │   └── payment/            # send, [transactionId]
│   ├── src/
│   │   ├── services/api/       # Typed API client (authApi, paymentApi, roomApi, etc.)
│   │   ├── context/            # Mobile AuthContext, SocketContext, CallContext
│   │   └── types/              # Complete TypeScript interfaces
│   ├── app.json
│   └── package.json
│
├── server/                     # Express.js REST API & Socket.IO server
│   ├── config/                 # Database & Passport OAuth
│   ├── controllers/            # auth, message, room, user, payment, webhook
│   ├── middleware/             # errorHandler, rateLimiter, validate, authorize, auth
│   ├── models/                 # User, Room, Message, Transaction, Notification, etc.
│   ├── routes/                 # Express API routes
│   ├── services/
│   │   ├── payments/           # RazorpayProvider, MockProvider, PaymentService, WebhookService
│   │   └── storage/            # LocalStorage, S3Storage, CloudinaryStorage adapters
│   ├── socket/                 # Socket.IO handlers
│   └── tests/                  # Automated backend test suites
│
├── docs/                       # In-depth architectural & deployment documentation
│   ├── architecture.md
│   ├── payments.md
│   ├── mobile.md
│   ├── security.md
│   └── deployment.md
│
├── .env.example                # Sample environment configuration
└── README.md
```

---

## ⚙️ Environment Configuration

Copy `.env.example` into `server/.env` and configure your settings:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret

CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# Payments (Options: "razorpay" or "mock" for test sandbox)
PAYMENT_PROVIDER=mock
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Storage (Options: "local", "s3", "cloudinary")
STORAGE_PROVIDER=local
```

---

## 💻 Local Development Setup

### 1. Server Setup
```bash
cd server
npm install
npm run dev
# Server runs on http://localhost:5000 (Health check: http://localhost:5000/health)
```

### 2. Web Client Setup
```bash
cd client
npm install
npm run dev
# Web application opens on http://localhost:5173
```

### 3. Mobile Client Setup (Expo)
```bash
cd mobile
npm install
npx expo start
# Scan the QR code with Expo Go (Android/iOS) or press 'w' to run in the web browser
```

---

## 🧪 Testing & Verification

### Run Backend Automated Tests
```bash
npm --prefix server test
```

### Run Mobile TypeScript Check
```bash
npm --prefix mobile run typecheck
```

### Build Web Client for Production
```bash
npm --prefix client run build
```

---

## 📚 Documentation
- [System Architecture](docs/architecture.md)
- [Payment System & Razorpay Integration](docs/payments.md)
- [Mobile Application Guide](docs/mobile.md)
- [Security Architecture](docs/security.md)
- [Deployment Guide](docs/deployment.md)
