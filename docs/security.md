# Security Architecture & Best Practices

## 1. Security Overview
ChatApp adheres to defense-in-depth principles across its network, API, authentication, data persistence, and payment processing layers.

---

## 2. API & Network Security

1. **Helmet Middleware**: Configures secure HTTP headers (Content Security Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options).
2. **CORS Restrictions**: Whitelists only verified frontend domains specified in `CLIENT_URL`.
3. **Granular Rate Limiting**:
   - General API limiter: Prevents volumetric DDoS.
   - Authentication limiter: Prevents brute-force credential stuffing on `/api/auth/*`.
   - Payment limiter: Stricter rate limiting on order creation and payment verification endpoints.
4. **Request ID Tracking**: Each incoming request receives a unique `X-Request-Id` for tracing and audit logging.

---

## 3. Authentication & Session Security

1. **Password Hashing**: Passwords hashed using `bcryptjs` with a salt work factor of 10. Passwords are never returned in queries (`select: false`).
2. **JWT Security**: Signed with SHA-256 using strong environment secrets (`JWT_SECRET`). Token expiry is enforced and verified on every protected request.
3. **One-Time Passwords (OTP)**:
   - Cryptographically generated using `crypto.randomInt`.
   - Stored on the user model only as a SHA-256 hash (`crypto.createHash("sha256")`).
   - Timed expiration strictly enforced (10 minutes TTL).
4. **Sanitization**: All user inputs (usernames, notes, emails) are validated and trimmed to prevent injection attacks.

---

## 4. Payment Security & Fraud Prevention

1. **Cryptographic Signature Verification**:
   Payment signatures from Razorpay are verified on the server using HMAC-SHA256:
   ```javascript
   const expectedSignature = crypto
     .createHmac("sha256", secret)
     .update(`${orderId}|${paymentId}`)
     .digest("hex");
   const match = crypto.timingSafeEqual(
     Buffer.from(signature),
     Buffer.from(expectedSignature)
   );
   ```
2. **No Client Trust**:
   The frontend never provides payment success flags; the server independently reconciles state before marking a transaction successful.
3. **Integer Minor Units**:
   Amounts are always integers (paise) to prevent rounding errors or fractional manipulation.
4. **Idempotency Keys**:
   Prevents double-charging if requests are retried.
5. **Audit Logging**:
   Financial events emit structured audit records with timestamps, user IDs, IP addresses, and gateway order IDs.
