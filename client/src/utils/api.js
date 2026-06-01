import axios from "axios";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("chatapp_user") || "null");
  } catch {
    localStorage.removeItem("chatapp_user");
  }
  if (user?.token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;
