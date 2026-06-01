import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useWebRTC } from "../hooks/useWebRTC";
import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import CallModal from "../components/call/CallModal";
import IncomingCall from "../components/call/IncomingCall";
import api from "../utils/api";
import img from "../asset/kotha-202-logo.svg";



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
    const { data } = await api.get("/rooms");
    setRooms(data);
  };

  
  const openChat = async (targetUserId) => {
    const { data } = await api.post("/rooms", { userId: targetUserId });
    setActiveRoom(data);
    fetchRooms();
  };

  const createGroup = async ({ name, userIds }) => {
    const { data } = await api.post("/rooms", { name, userIds });
    setActiveRoom(data);
    fetchRooms();
  };

  const updateRoomMembers = useCallback((updatedUser) => (room) => ({
      ...room,
      members: room.members?.map((member) =>
        member._id === updatedUser._id ? { ...member, ...updatedUser } : member
      ),
    }), []);

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
    <div className="flex h-[100dvh] overflow-hidden bg-slate-950">
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
          <div className="flex-1 flex items-center justify-center px-6 text-slate-500">
            <div className="text-center">
              <button
                type="button"
                onClick={fetchRooms}
                className="kotha-logo-card group mx-auto mb-7 flex h-44 w-44 items-center justify-center rounded-full outline-none transition duration-500 hover:-translate-y-1 hover:scale-105 focus-visible:ring-4 focus-visible:ring-cyan-300/30 active:scale-95 sm:h-56 sm:w-56"
                aria-label="Refresh chats"
              >
                <img
                  src={img}
                  alt="Kotha 202 logo"
                  className="relative h-full w-full rounded-full bg-slate-950 object-cover drop-shadow-2xl transition duration-500 group-hover:rotate-3 group-hover:scale-110"
                />
              </button>
              <p className="text-xl font-semibold tracking-wide text-slate-100 sm:text-2xl">
                kotha-202-connect
              </p>
            </div>
          </div>
        )}
      </main>

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
