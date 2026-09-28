/**
 * Abstract PaymentProvider Interface.
 * Any payment gateway integration (Razorpay, Stripe, Mock) implements this interface.
 */
class PaymentProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Creates an order with the gateway.
   * @param {Object} params - { amount, currency, receipt, notes }
   * @returns {Promise<{ orderId: string, amount: number, currency: string, [key: string]: any }>}
   */
  async createOrder(_params) {
    throw new Error("createOrder() must be implemented by payment provider");
  }

  /**
   * Verifies payment authenticity via cryptographic signature.
   * @param {Object} params - { orderId, paymentId, signature }
   * @returns {Promise<boolean>}
   */
  async verifyPayment(_params) {
    throw new Error("verifyPayment() must be implemented by payment provider");
  }

  /**
   * Retrieves payment details from the gateway.
   * @param {string} paymentId
   * @returns {Promise<Object>}
   */
  async getPayment(_paymentId) {
    throw new Error("getPayment() must be implemented by payment provider");
  }

  /**
   * Refunds a captured payment.
   * @param {Object} params - { paymentId, amount, notes }
   * @returns {Promise<Object>}
   */
  async refundPayment(_params) {
    throw new Error("refundPayment() must be implemented by payment provider");
  }

  /**
   * Verifies and handles incoming webhook events.
   * @param {Object} params - { rawBody, signature }
   * @returns {Promise<{ event: string, payload: any }>}
   */
  async handleWebhook(_params) {
    throw new Error("handleWebhook() must be implemented by payment provider");
  }
}

module.exports = PaymentProvider;
