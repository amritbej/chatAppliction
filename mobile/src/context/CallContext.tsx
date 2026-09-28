import React, { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";
import { CallSession } from "../types";

interface CallContextType {
  call: CallSession | null;
  startCall: (target: { userId?: string; roomId?: string; username: string }, type: "audio" | "video") => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextType>({
  call: null,
  startCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
});

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const [call, setCall] = useState<CallSession | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: any) => {
      setCall({
        userId: data.from,
        username: data.fromUsername,
        roomId: data.roomId,
        callType: data.callType || "audio",
        status: "ringing",
      });
    };

    const handleCallAnswered = () => {
      setCall((c) => (c ? { ...c, status: "connected" } : null));
    };

    const handleCallEnded = () => {
      setCall(null);
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:answered", handleCallAnswered);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallEnded);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:answered", handleCallAnswered);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallEnded);
    };
  }, [socket]);

  const startCall = (target: { userId?: string; roomId?: string; username: string }, type: "audio" | "video") => {
    setCall({
      userId: target.userId,
      roomId: target.roomId,
      username: target.username,
      callType: type,
      status: "calling",
    });

    if (target.roomId) {
      socket?.emit("call:room:start", { roomId: target.roomId, callType: type });
    } else if (target.userId) {
      socket?.emit("call:offer", { to: target.userId, callType: type, offer: { type: "offer", sdp: "" } });
    }
  };

  const acceptCall = () => {
    if (!call) return;
    setCall({ ...call, status: "connected" });
    if (call.roomId) {
      socket?.emit("call:room:accept", { roomId: call.roomId });
    } else if (call.userId) {
      socket?.emit("call:answer", { to: call.userId, answer: { type: "answer", sdp: "" } });
    }
  };

  const rejectCall = () => {
    if (call?.roomId) {
      socket?.emit("call:room:reject", { roomId: call.roomId });
    } else if (call?.userId) {
      socket?.emit("call:reject", { to: call.userId });
    }
    setCall(null);
  };

  const endCall = () => {
    if (call?.roomId) {
      socket?.emit("call:room:leave", { roomId: call.roomId });
    } else if (call?.userId) {
      socket?.emit("call:end", { to: call.userId });
    }
    setCall(null);
  };

  return (
    <CallContext.Provider value={{ call, startCall, acceptCall, rejectCall, endCall }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
