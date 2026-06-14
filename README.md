# ChatApp

A modern, real-time, full-stack chat application equipped with text/file messaging, WebRTC audio/video calls, and email OTP verification.

🚀 **Live Site:** [https://chatappliction-i23b.onrender.com](https://chatappliction-i23b.onrender.com)  
🖥️ **Backend API:** [https://chatappliction-m73z.onrender.com](https://chatappliction-m73z.onrender.com)

---

## Features

### 💬 Real-Time Messaging
* **Instant Delivery:** Message broadcasting powered by Socket.IO.
* **Rich Media Support:** Send text, images, and attachments (up to 5MB).
* **Threads & Replies:** Reply directly to specific messages.
* **Mentions & Mentions Tracking:** Mention users in a room with `@username`.
* **Typing Indicators:** Real-time feedback when other users are typing.
* **User Status:** Live online/offline status indicators and last seen timestamps.

### 📞 WebRTC Audio/Video Calls
* Peer-to-peer direct audio/video calling.
* Group call capabilities for up to 15 participants in a chat room.
* Socket.IO-based signaling server for WebRTC handshake configuration.

### 🔐 Secure Authentication
* **Local Auth:** Traditional sign-up and login using email/password.
* **OTP Verification:** Registration email verification using secure, timed OTPs sent via SMTP.
* **Password Recovery:** Forgotten password resets authenticated by email OTP verification.
* **OAuth 2.0:** One-click registration/login with Google OAuth (via Passport.js).

### 👤 Profile Customization
* Upload and customize user avatar pictures.
* Real-time avatar updates propagated instantly to active chats.

---

## Technology Stack

### Frontend (Client)
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS, PostCSS
* **Routing:** React Router DOM
* **State & Networking:** Axios, React Context API
* **WebSockets:** Socket.io-client
* **P2P Connection:** WebRTC API (STUN servers)

### Backend (Server)
* **Runtime:** Node.js (Express)
* **Database:** MongoDB (using Mongoose ODM)
* **Authentication:** Passport.js (Google Strategy), JSON Web Tokens (JWT), Bcrypt.js
* **Real-time Engine:** Socket.IO
* **Email Transporter:** Nodemailer

---

## Directory Structure

```text
├── client/                     # Frontend Vite + React application
│   ├── dist/                   # Production build outputs
│   ├── public/                 # Static assets (favicons, etc.)
│   ├── src/
│   │   ├── asset/              # SVGs, images, logos
│   │   ├── components/         # Reusable React components
│   │   │   ├── call/           # WebRTC Call modals and widgets
│   │   │   ├── chat/           # Chat window, sidebar, message bubble
│   │   │   ├── common/         # Common UI components (e.g. Avatar)
│   │   │   └── profile/        # User profile customization modal
│   │   ├── context/            # React Auth and Socket contexts
│   │   ├── hooks/              # Custom React hooks (WebRTC hook)
│   │   ├── pages/              # Application pages (Chat, Login, Verify, etc.)
│   │   ├── utils/              # Axios instance and API configuration
│   │   ├── App.jsx             # React Routes and app assembly
│   │   ├── index.css           # Global CSS and Tailwind directives
│   │   └── main.jsx            # React entrypoint
│   ├── package.json
│   ├── tailwind.config.js      # Tailwind UI design configuration
│   └── vite.config.js          # Vite configuration and local Proxy settings
│
├── server/                     # Backend Node.js Express server
│   ├── config/                 # Mongoose Database & Passport OAuth setups
│   ├── controllers/            # Core business logic handlers (Auth, Messages, Rooms)
│   ├── middleware/             # Route protections and custom middleware
│   ├── models/                 # Mongoose schemas (User, Message, Room)
│   ├── routes/                 # Express API endpoints
│   ├── socket/                 # Socket.IO connection and event handler
│   ├── utils/                  # Mailer transporter, OTP, and validation helpers
│   ├── .env                    # Local environment secrets (ignored by Git)
│   ├── index.js                # App server entrypoint
│   └── package.json
│
└── README.md
```

---

## Configuration & Environment Setup

### 1. Server Environment (`server/.env`)
Create a `.env` file inside the `server/` directory and configure the following variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_express_session_secret

# URLs (Local Development defaults)
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# SMTP Mail Server Settings (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email_address
SMTP_PASS=your_email_app_password
EMAIL_FROM=your_email_address
```

### 2. Client Environment
For local development, Vite uses the proxy configured in `vite.config.js` to route `/api` requests to the local server (`http://localhost:5000`).

For production deployments, the frontend requires the backend URL. You can set the backend API domain using:
* `VITE_API_ORIGIN` = `https://chatappliction-m73z.onrender.com`

*Note: The frontend code falls back to `https://chatappliction-m73z.onrender.com` automatically in production environments if this variable is not explicitly specified.*

---

## Local Development Installation

### Step 1: Clone the repository
```bash
git clone <repository_url>
cd chatapp
```

### Step 2: Set up the Backend
```bash
cd server
npm install
# Configure your .env file here
npm run dev
```

### Step 3: Set up the Frontend
```bash
cd ../client
npm install
npm run dev
```
Open your browser to `http://localhost:5173`.

---

## Production Deployment on Render

### Backend Web Service
1. **Repository root:** Deploy the `server/` subfolder.
2. **Build Command:** `npm install`
3. **Start Command:** `node index.js`
4. Set up the environment variables in the Render console as described in the configuration section above. Keep `NODE_ENV` as `production`.

### Frontend Static Site
1. **Repository root:** Deploy the `client/` subfolder.
2. **Build Command:** `npm run build`
3. **Publish directory:** `dist`
4. **Environment Variables:** Set `VITE_API_ORIGIN` to your backend URL (`https://chatappliction-m73z.onrender.com`).
5. **Rewrites/Redirects Configuration (SPA routing support):**
   To support client-side routing and prevent `404 Not Found` errors on direct page refreshes or OAuth redirects, add the following rewrite rule in Render:
   * **Source:** `/*`
   * **Destination:** `/index.html`
   * **Action:** `Rewrite`
