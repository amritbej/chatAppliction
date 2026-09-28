import { apiClient } from "./apiClient";
import { Transaction } from "../../types";

export interface GetTransactionsParams {
  type?: "all" | "sent" | "received";
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalSentMinor: number;
    totalReceivedMinor: number;
    totalSentINR: string;
    totalReceivedINR: string;
  };
}

export const transactionApi = {
  async getTransactions(params?: GetTransactionsParams): Promise<TransactionsResponse> {
    const q = new URLSearchParams();
    if (params?.type) q.append("type", params.type);
    if (params?.status) q.append("status", params.status);
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);

    const res = await apiClient.get(`/payments?${q.toString()}`);
    return res.data.data;
  },

  async getTransactionDetails(transactionId: string): Promise<Transaction> {
    const res = await apiClient.get(`/payments/${transactionId}`);
    return res.data.data;
  },
};
