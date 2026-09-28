const Transaction = require("../../models/Transaction");
const paymentService = require("./paymentService");

class WebhookService {
  /**
   * Processes a webhook from the payment gateway.
   */
  async processWebhook({ rawBody, signature }) {
    const provider = paymentService.getProvider();
    const { event, payload } = await provider.handleWebhook({ rawBody, signature });

    console.log(`[PAYMENT:WEBHOOK] Processing event: ${event}`);

    switch (event) {
      case "payment.captured": {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        const paymentId = paymentEntity?.id;

        if (orderId && paymentId) {
          const transaction = await Transaction.findOne({ providerOrderId: orderId });
          if (transaction && transaction.status !== "success") {
            await paymentService.verifyPayment({
              transactionId: transaction.transactionId,
              providerPaymentId: paymentId,
              providerOrderId: orderId,
              signature: "webhook_verified", // Provider already verified signature above
              paymentMethod: paymentEntity.method || "unknown",
            });
          }
        }
        break;
      }

      case "payment.failed": {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;

        if (orderId) {
          const transaction = await Transaction.findOne({ providerOrderId: orderId });
          if (transaction && transaction.status !== "failed" && transaction.status !== "success") {
            transaction.status = "failed";
            transaction.failureReason = paymentEntity.error_description || "Payment failed at gateway";
            await transaction.save();
            paymentService.emitPaymentEvent(transaction, "payment:failed", {
              reason: transaction.failureReason,
            });
          }
        }
        break;
      }

      default:
        console.log(`[PAYMENT:WEBHOOK] Unhandled event type: ${event}`);
        break;
    }

    return { received: true, event };
  }
}

module.exports = new WebhookService();
