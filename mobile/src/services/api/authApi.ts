import { apiClient } from "./apiClient";
import { User } from "../../types";

export const authApi = {
  async register(data: { username: string; email: string; password: string }) {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
  },

  async login(data: { email: string; password: string }): Promise<User> {
    const res = await apiClient.post("/auth/login", data);
    return res.data;
  },

  async verifyEmail(data: { email: string; otp: string }): Promise<User> {
    const res = await apiClient.post("/auth/verify-email", data);
    return res.data;
  },

  async resendVerification(email: string) {
    const res = await apiClient.post("/auth/resend-verification", { email });
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await apiClient.post("/auth/forgot-password", { email });
    return res.data;
  },

  async resetPassword(data: { email: string; otp: string; password: string }): Promise<User> {
    const res = await apiClient.post("/auth/reset-password", data);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },
};
