import axios from "axios";

const api = axios.create({
  baseURL: "/api", 
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
