import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWebRTC } from "../hooks/useWebRTC";
import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import CallModal from "../components/call/CallModal";
import IncomingCall from "../components/call/IncomingCall";
import api from "../utils/api";

export default function ChatPage() {
  const { user, logout, updateUser } = useAuth();
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

  const handleProfileUpdated = (updatedUser) => {
    updateUser(updatedUser);

    const updateRoomMembers = (room) => ({
      ...room,
      members: room.members?.map((member) =>
        member._id === updatedUser._id ? { ...member, ...updatedUser } : member
      ),
    });

    setRooms((current) => current.map(updateRoomMembers));
    setActiveRoom((current) => (current ? updateRoomMembers(current) : current));
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
    <div className="h-screen bg-slate-950 flex overflow-hidden">
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

      <main className="flex-1 flex flex-col">
        {activeRoom ? (
          <ChatWindow
            room={activeRoom}
            currentUser={user}
            onStartCall={webRTC.startCall}
            onMessageReceived={handleMessageReceived}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-2xl text-emerald-300">
                #
              </div>
              <p className="text-lg text-slate-300">
                Select a conversation to start chatting
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
