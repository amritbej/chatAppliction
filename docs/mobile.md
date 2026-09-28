# React Native & Expo Mobile Application Architecture

## 1. Overview
The mobile application is a production-ready, cross-platform client built in the `mobile/` directory using:
- **Framework**: Expo (SDK 52+ / React Native 0.76+)
- **Routing**: Expo Router (file-based navigation with typed routes)
- **Language**: TypeScript throughout
- **State & Caching**: React Context + optimistic offline store
- **Networking**: Axios instance with centralized API service layer
- **Real-Time**: Socket.IO client
- **Storage**: AsyncStorage / Expo SecureStore
- **Styling**: Native components with adaptive dark/light palette

---

## 2. Directory Structure

```text
mobile/
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx             # Root layout with theme, auth & socket providers
│   ├── index.tsx               # Entry redirect / splash
│   ├── (auth)/                 # Authentication stack
│   │   ├── _layout.tsx
│   │   ├── login.tsx           # Login screen
│   │   ├── register.tsx        # Registration screen
│   │   ├── verify-email.tsx    # OTP verification
│   │   └── forgot-password.tsx # Password reset
│   ├── (tabs)/                 # Main authenticated bottom tabs
│   │   ├── _layout.tsx         # Bottom tabs configuration
│   │   ├── chats.tsx           # Conversations list & search
│   │   ├── payments.tsx        # Wallet & transaction history
│   │   ├── people.tsx          # User directory & group creation
│   │   └── settings.tsx        # User profile, privacy, logout
│   ├── chat/
│   │   └── [roomId].tsx        # Real-time chat & payment composer
│   └── payment/
│       ├── send.tsx            # Payment flow modal
│       ├── [transactionId].tsx # Transaction details
│       ├── success.tsx         # Payment success confirmation
│       └── failed.tsx          # Payment failure state
├── src/
│   ├── components/             # Reusable UI widgets (Avatar, Bubbles, Modals)
│   ├── context/                # AuthContext, SocketContext, CallContext
│   ├── hooks/                  # useWebRTC, useNetworkStatus, useDebounce
│   ├── services/
│   │   ├── api/                # Typed API client modules
│   │   │   ├── apiClient.ts
│   │   │   ├── authApi.ts
│   │   │   ├── userApi.ts
│   │   │   ├── roomApi.ts
│   │   │   ├── messageApi.ts
│   │   │   ├── paymentApi.ts
│   │   │   └── transactionApi.ts
│   │   └── socket/             # Socket connection manager
│   ├── types/                  # Shared TypeScript interfaces
│   └── utils/                  # Formatting, storage helpers, validation
├── app.json
├── package.json
└── tsconfig.json
```

---

## 3. Offline-First Experience

1. **Local Message Queue**:
   When network is unavailable, messages sent by the user are saved with a temporary ID and status `"pending"`.
2. **Reconnection & Synchronization**:
   The Socket service listens to `connect` and `reconnect` events. When reconnected, queued messages are sent sequentially, and message state is synchronized with `GET /api/messages/:roomId?since=<timestamp>`.
3. **Payments Safeguard**:
   Payments strictly require an active internet connection. Offline payment initiation is blocked at the UI and service level with informative feedback.

---

## 4. Mobile WebRTC Call Abstraction

- Handled via `CallService` and `useWebRTC` hook.
- Automatically detects environment:
  - On Web / React Native Web: uses standard `navigator.mediaDevices` and `RTCPeerConnection`.
  - On Native: configured to mount `react-native-webrtc` when compiled with EAS build.
- ICE candidates and signaling messages are routed through the shared Socket.IO connection.
