
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { API_ORIGIN } from "../utils/config";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!user?.token) return; 
    const socketOptions = {
      auth: { token: user.token },
    };
    socketRef.current = API_ORIGIN ? io(API_ORIGIN, socketOptions) : io(socketOptions);

    socketRef.current.on("connect", () => setIsConnected(true));
    socketRef.current.on("disconnect", () => setIsConnected(false));

    
    socketRef.current.on("user:online", (userId) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });
    socketRef.current.on("user:offline", (userId) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.token]);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected, onlineUsers }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
