# Deployment Guide

## 1. Prerequisites
- Node.js 18+ (tested on Node.js 20 & 26)
- PostgreSQL 14+ (Render Managed PostgreSQL or local PostgreSQL)
- Razorpay account (Sandbox or Live API Key & Secret)
- SMTP email service (Gmail App Password, SendGrid, Amazon SES, or Mailgun)

---

## 2. Server Deployment (Render)

1. **Deploy PostgreSQL**:
   - In Render Dashboard, click **New +** -> **PostgreSQL**.
   - Create a free database named `chatapp`.
   - Copy the **Internal Database URL** (e.g. `postgresql://chatapp_user:...@dpg-...-a/chatapp`).
2. **Deploy Web Service**:
   - Choose `server/` as the root directory.
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npx prisma db push
     ```
   - **Start Command**:
     ```bash
     node index.js
     ```
3. **Environment Variables**:
   - `DATABASE_URL`: Paste the Internal Database URL from your Render PostgreSQL instance.
   - Configure all remaining variables in the platform dashboard (refer to `.env.example`).
4. **Health Check Endpoint**:
   - Configure platform health check path to `/health`.

---

## 3. Web Client Deployment (e.g. Render, Vercel, Cloudflare)

1. **Deploy Repository**: Choose `client/` as the root directory.
2. **Build Command**:
   ```bash
   npm run build
   ```
3. **Publish Directory**: `dist`
4. **Environment Variables**:
   `VITE_API_ORIGIN=https://your-api-domain.com`
5. **SPA Rewrites**:
   Configure redirect from `/*` to `/index.html` with HTTP status 200.

---

## 4. Mobile Client (Expo EAS Build)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. In `mobile/`:
   ```bash
   eas build:configure
   eas build --platform android
   eas build --platform ios
   ```
3. For local development:
   ```bash
   npm --prefix mobile install
   npm --prefix mobile start
   ```
