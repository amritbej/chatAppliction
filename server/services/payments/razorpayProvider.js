const crypto = require("crypto");
const Razorpay = require("razorpay");
const PaymentProvider = require("./paymentProvider");

class RazorpayProvider extends PaymentProvider {
  constructor() {
    super("razorpay");
    this.keyId = process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return Boolean(this.keyId && this.keySecret);
  }

  async createOrder({ amount, currency = "INR", receipt, notes = {} }) {
    if (!this.client) {
      throw new Error("Razorpay credentials not configured");
    }

    const options = {
      amount, // Amount in minor units (e.g. paise)
      currency,
      receipt,
      notes,
    };

    const order = await this.client.orders.create(options);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: this.keyId,
      receipt: order.receipt,
    };
  }

  async verifyPayment({ orderId, paymentId, signature }) {
    if (!this.keySecret) {
      throw new Error("Razorpay secret not configured");
    }

    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const generatedSignature = crypto
      .createHmac("sha256", this.keySecret)
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
    if (!this.client) {
      throw new Error("Razorpay credentials not configured");
    }
    return this.client.payments.fetch(paymentId);
  }

  async refundPayment({ paymentId, amount, notes = {} }) {
    if (!this.client) {
      throw new Error("Razorpay credentials not configured");
    }
    return this.client.payments.refund(paymentId, { amount, notes });
  }

  async handleWebhook({ rawBody, signature }) {
    if (!this.webhookSecret) {
      throw new Error("Razorpay webhook secret not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error("Invalid webhook signature");
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    return {
      event: payload.event,
      payload,
    };
  }
}

module.exports = RazorpayProvider;
