import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { storage } from "../../utils/storage";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem("chatapp_token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard error formatting
    const customError = error.response?.data?.error || {
      code: "NETWORK_ERROR",
      message: error.message || "Network request failed",
    };
    return Promise.reject(customError);
  }
);

export const getSocketUrl = (): string => API_BASE;
