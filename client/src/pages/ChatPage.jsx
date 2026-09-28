import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useWebRTC } from "../hooks/useWebRTC";
import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import CallModal from "../components/call/CallModal";
import IncomingCall from "../components/call/IncomingCall";
import api from "../utils/api";

export default function ChatPage() {
  const { user, logout, updateUser } = useAuth();
  const { socket } = useSocket();
  const [activeRoom, setActiveRoom] = useState(null);
  const [rooms, setRooms] = useState([]);

  const webRTC = useWebRTC();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get("/rooms");
      setRooms(data);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  };

  const openChat = async (targetUserId) => {
    try {
      const { data } = await api.post("/rooms", { userId: targetUserId });
      setActiveRoom(data);
      fetchRooms();
    } catch (err) {
      console.error("Failed to open chat", err);
    }
  };

  const createGroup = async ({ name, userIds }) => {
    try {
      const { data } = await api.post("/rooms", { name, userIds });
      setActiveRoom(data);
      fetchRooms();
    } catch (err) {
      console.error("Failed to create group", err);
    }
  };

  const updateRoomMembers = useCallback(
    (updatedUser) => (room) => ({
      ...room,
      members: room.members?.map((member) =>
        member._id === updatedUser._id ? { ...member, ...updatedUser } : member
      ),
    }),
    []
  );

  useEffect(() => {
    if (!socket) return;

    const handleUserUpdated = (updatedUser) => {
      setRooms((current) => current.map(updateRoomMembers(updatedUser)));
      setActiveRoom((current) =>
        current ? updateRoomMembers(updatedUser)(current) : current
      );
    };

    socket.on("user:updated", handleUserUpdated);
    return () => socket.off("user:updated", handleUserUpdated);
  }, [socket, updateRoomMembers]);

  const handleProfileUpdated = (updatedUser) => {
    const refreshedUser = {
      ...updatedUser,
      avatarVersion: Date.now(),
    };

    updateUser(refreshedUser);
    socket?.emit("user:profile-updated");

    setRooms((current) => current.map(updateRoomMembers(refreshedUser)));
    setActiveRoom((current) =>
      current ? updateRoomMembers(refreshedUser)(current) : current
    );
  };

  const handleMessageReceived = useCallback((message) => {
    setRooms((current) =>
      current
        .map((room) =>
          room._id === message.room ? { ...room, lastMessage: message } : room
        )
        .sort((a, b) => {
          const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || 0);
          const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || 0);
          return bTime - aTime;
        })
    );
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-950 font-sans">
      <Sidebar
        rooms={rooms}
        activeRoom={activeRoom}
        currentUser={user}
        onSelectRoom={setActiveRoom}
        onOpenChat={openChat}
        onCreateGroup={createGroup}
        onProfileUpdated={handleProfileUpdated}
        onLogout={logout}
      />

      <main
        className={`min-w-0 flex-1 flex-col ${
          activeRoom ? "flex" : "hidden md:flex"
        }`}
      >
        {activeRoom ? (
          <ChatWindow
            room={activeRoom}
            currentUser={user}
            onStartCall={webRTC.startCall}
            onMessageReceived={handleMessageReceived}
            onBack={() => setActiveRoom(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="max-w-md space-y-6">
              {/* Modern Brand Icon (No Logo) */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-950/60 text-3xl text-white">
                💬
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  ChatApp & Payments
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Real-time messaging, WebRTC calling, and instant peer-to-peer payments.
                </p>
              </div>

              {/* Quick Feature Highlights */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-left">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="text-emerald-400 text-lg mb-1 font-bold">⚡ Fast</div>
                  <p className="text-xs text-slate-400">Instant messaging powered by Socket.IO</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="text-emerald-400 text-lg mb-1 font-bold">₹ Payments</div>
                  <p className="text-xs text-slate-400">Send money directly inside any conversation</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="text-emerald-400 text-lg mb-1 font-bold">📞 Calling</div>
                  <p className="text-xs text-slate-400">Encrypted WebRTC voice and video calls</p>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Select a conversation from the sidebar or start a new chat in the People tab.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Calling Modals */}
      {(webRTC.callState === "calling" || webRTC.callState === "connected") && (
        <CallModal
          callState={webRTC.callState}
          callType={webRTC.callType}
          localVideoRef={webRTC.localVideoRef}
          remoteVideoRef={webRTC.remoteVideoRef}
          remoteStreams={webRTC.remoteStreams}
          onEndCall={webRTC.endCall}
          onToggleMute={webRTC.toggleMute}
          onToggleVideo={webRTC.toggleVideo}
        />
      )}

      {webRTC.callState === "ringing" && (
        <IncomingCall
          caller={webRTC.caller}
          callType={webRTC.callType}
          onAccept={webRTC.acceptCall}
          onReject={webRTC.rejectCall}
        />
      )}
    </div>
  );
}
