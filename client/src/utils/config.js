const trimTrailingSlash = (value) => value?.replace(/\/$/, "") || "";
const defaultApiOrigin = import.meta.env.DEV 
  ? "http://localhost:5000" 
  : "https://chatappliction-m73z.onrender.com";

export const API_ORIGIN = trimTrailingSlash(
  import.meta.env.VITE_API_ORIGIN || defaultApiOrigin
);
export const API_BASE_URL = `${API_ORIGIN}/api`;
export const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;
