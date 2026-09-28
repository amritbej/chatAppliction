const webhookService = require("../services/payments/webhookService");

const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"] || req.headers["x-mock-signature"];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const result = await webhookService.processWebhook({
      rawBody,
      signature: signature || "",
    });

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("[WEBHOOK:ERROR]", err.message);
    res.status(400).json({
      success: false,
      error: {
        code: "WEBHOOK_VERIFICATION_FAILED",
        message: err.message,
      },
    });
  }
};

module.exports = { handleRazorpayWebhook };
