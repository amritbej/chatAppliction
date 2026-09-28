import { apiClient } from "./apiClient";
import { Transaction } from "../../types";

export interface CreateOrderParams {
  recipientId: string;
  roomId?: string;
  amount: number;
  note?: string;
  idempotencyKey?: string;
}

export interface VerifyPaymentParams {
  transactionId: string;
  providerPaymentId: string;
  providerOrderId?: string;
  signature: string;
  paymentMethod?: string;
}

export const paymentApi = {
  async createOrder(params: CreateOrderParams) {
    const res = await apiClient.post("/payments/orders", params);
    return res.data;
  },

  async verifyPayment(params: VerifyPaymentParams): Promise<Transaction> {
    const res = await apiClient.post("/payments/verify", params);
    return res.data.data;
  },

  async refundTransaction(transactionId: string, reason?: string): Promise<Transaction> {
    const res = await apiClient.post(`/payments/${transactionId}/refund`, { reason });
    return res.data.data;
  },
};
