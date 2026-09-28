import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { storage } from "../utils/storage";
import { authApi } from "../services/api/authApi";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const stored = await storage.getItem("chatapp_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Background verify session
        try {
          const fresh = await authApi.getMe();
          setUser({ ...parsed, ...fresh });
        } catch {
          // Token expired or invalid
          await logout();
        }
      }
    } catch (e) {
      console.warn("Failed to load user session", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    setUser(userData);
    await storage.setItem("chatapp_user", JSON.stringify(userData));
    if (userData.token) {
      await storage.setItem("chatapp_token", userData.token);
    }
  };

  const logout = async () => {
    setUser(null);
    await storage.removeItem("chatapp_user");
    await storage.removeItem("chatapp_token");
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((curr) => {
      if (!curr) return null;
      const updated = { ...curr, ...updates };
      storage.setItem("chatapp_user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
