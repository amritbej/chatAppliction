const crypto = require("crypto");
const PaymentProvider = require("./paymentProvider");

class MockProvider extends PaymentProvider {
  constructor() {
    super("mock");
    this.secret = process.env.MOCK_PAYMENT_SECRET || "mock_sandbox_secret_key_12345";
  }

  isConfigured() {
    return true;
  }

  async createOrder({ amount, currency = "INR", receipt, notes = {} }) {
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      orderId,
      amount,
      currency,
      key: "mock_key_test",
      receipt,
      notes,
    };
  }

  async verifyPayment({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    // For test convenience, accepts "mock_valid_signature" or valid HMAC
    if (signature === "mock_valid_signature") {
      return true;
    }

    const generatedSignature = crypto
      .createHmac("sha256", this.secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(generatedSignature)
      );
    } catch {
      return false;
    }
  }

  async getPayment(paymentId) {
    return {
      id: paymentId,
      status: "captured",
      amount: 10000,
      currency: "INR",
      method: "upi",
    };
  }

  async refundPayment({ paymentId, amount }) {
    return {
      id: `rfnd_mock_${Date.now()}`,
      paymentId,
      amount,
      status: "processed",
    };
  }

  async handleWebhook({ rawBody, signature }) {
    if (signature === "mock_webhook_signature") {
      const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      return { event: payload.event, payload };
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.secret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error("Invalid mock webhook signature");
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    return {
      event: payload.event,
      payload,
    };
  }
}

module.exports = MockProvider;
