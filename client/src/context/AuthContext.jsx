
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("chatapp_user");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem("chatapp_user");
      return null;
    }
  });

  const login = (userData) => {
    localStorage.setItem("chatapp_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("chatapp_user");
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((current) => {
      const next = { ...current, ...updates };
      localStorage.setItem("chatapp_user", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
