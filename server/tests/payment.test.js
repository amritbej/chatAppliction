const { describe, it } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const paymentService = require("../services/payments/paymentService");
const webhookService = require("../services/payments/webhookService");
const RazorpayProvider = require("../services/payments/razorpayProvider");
const MockProvider = require("../services/payments/mockProvider");

describe("Payment Minor Units & Calculations", () => {
  it("should convert integer rupees to paise accurately", () => {
    assert.strictEqual(paymentService.toMinorUnits(100), 10000);
    assert.strictEqual(paymentService.toMinorUnits(1), 100);
    assert.strictEqual(paymentService.toMinorUnits(500), 50000);
  });

  it("should convert decimal rupees to paise without floating-point errors", () => {
    assert.strictEqual(paymentService.toMinorUnits(100.5), 10050);
    assert.strictEqual(paymentService.toMinorUnits(10.25), 1025);
    assert.strictEqual(paymentService.toMinorUnits(99.99), 9999);
  });

  it("should reject zero, negative, or invalid amounts", () => {
    assert.throws(() => paymentService.toMinorUnits(0), /Invalid payment amount/);
    assert.throws(() => paymentService.toMinorUnits(-50), /Invalid payment amount/);
    assert.throws(() => paymentService.toMinorUnits(NaN), /Invalid payment amount/);
    assert.throws(() => paymentService.toMinorUnits("500"), /Invalid payment amount/);
  });
});

describe("Payment Security & Provider Signatures", () => {
  it("should verify valid mock signatures", async () => {
    const mockProvider = new MockProvider();
    const isValid = await mockProvider.verifyPayment({
      orderId: "order_123",
      paymentId: "pay_123",
      signature: "mock_valid_signature",
    });
    assert.strictEqual(isValid, true);
  });

  it("should reject invalid mock signatures", async () => {
    const mockProvider = new MockProvider();
    const isValid = await mockProvider.verifyPayment({
      orderId: "order_123",
      paymentId: "pay_123",
      signature: "forged_fraudulent_signature",
    });
    assert.strictEqual(isValid, false);
  });

  it("should correctly verify HMAC-SHA256 Razorpay signatures", async () => {
    const rzp = new RazorpayProvider();
    const testSecret = "test_razorpay_secret_key_999";
    rzp.keySecret = testSecret;

    const orderId = "order_rzp_987654";
    const paymentId = "pay_rzp_123456";
    const validSignature = crypto
      .createHmac("sha256", testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const result = await rzp.verifyPayment({
      orderId,
      paymentId,
      signature: validSignature,
    });
    assert.strictEqual(result, true);

    const tamperedResult = await rzp.verifyPayment({
      orderId,
      paymentId,
      signature: "invalid_tampered_signature",
    });
    assert.strictEqual(tamperedResult, false);
  });

  it("should reject Razorpay verification with missing parameters", async () => {
    const rzp = new RazorpayProvider();
    rzp.keySecret = "secret";
    assert.strictEqual(await rzp.verifyPayment({ orderId: "", paymentId: "p", signature: "s" }), false);
    assert.strictEqual(await rzp.verifyPayment({ orderId: "o", paymentId: "", signature: "s" }), false);
    assert.strictEqual(await rzp.verifyPayment({ orderId: "o", paymentId: "p", signature: "" }), false);
  });
});

describe("Webhook Signature & Idempotency", () => {
  it("should verify valid webhook signature in MockProvider", async () => {
    const mock = new MockProvider();
    const rawBody = JSON.stringify({ event: "payment.captured", data: { id: "pay_123" } });
    const expectedSig = crypto
      .createHmac("sha256", mock.secret)
      .update(rawBody)
      .digest("hex");

    const result = await mock.handleWebhook({ rawBody, signature: expectedSig });
    assert.strictEqual(result.event, "payment.captured");
  });

  it("should reject tampered webhook payload or signature", async () => {
    const mock = new MockProvider();
    const rawBody = JSON.stringify({ event: "payment.captured" });
    await assert.rejects(
      async () => {
        await mock.handleWebhook({ rawBody, signature: "invalid_sig" });
      },
      /Invalid mock webhook signature/
    );
  });
});

describe("Payment Gateway Checkout Page", () => {
  it("should provide standalone pay.html with Razorpay checkout script", () => {
    const fs = require("fs");
    const path = require("path");
    const checkoutPath = path.join(__dirname, "../public/pay.html");
    assert.strictEqual(fs.existsSync(checkoutPath), true);

    const content = fs.readFileSync(checkoutPath, "utf8");
    assert.match(content, /checkout\.razorpay\.com\/v1\/checkout\.js/);
    assert.match(content, /transactionId/);
    assert.match(content, /chatapp:\/\/payment\/callback/);
  });
});
