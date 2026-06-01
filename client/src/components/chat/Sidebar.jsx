import { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import Avatar from "../common/Avatar";
import ProfileModal from "../profile/ProfileModal";
import api from "../../utils/api";

export default function Sidebar({
  rooms,
  activeRoom,
  currentUser,
  onSelectRoom,
  onOpenChat,
  onCreateGroup,
  onProfileUpdated,
  onLogout,
}) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("chats");
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const { onlineUsers } = useSocket();

  useEffect(() => {
    if (tab === "people") fetchUsers();
  }, [tab]);

  const fetchUsers = async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  };

  const getOtherMember = (room) =>
    room.members?.find((m) => m._id !== currentUser._id);

  const filteredRooms = rooms.filter((r) => {
    const other = getOtherMember(r);
    const label = r.isGroup ? r.name : other?.username;
    return label?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const isOnline = (userId) =>
    onlineUsers.has(userId) || false;

  const getLastMessagePreview = (message) => {
    if (!message) return "Start chatting";
    if (message.type === "image") return "Image";
    if (message.type === "file") return message.fileName || "File";
    return message.content;
  };

  const getRoomTitle = (room) => {
    if (room.isGroup) return room.name || "Group chat";
    return getOtherMember(room)?.username;
  };

  const getRoomInitial = (room) => getRoomTitle(room)?.[0]?.toUpperCase();

  const toggleSelectedUser = (userId) => {
    setSelectedUsers((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      if (current.length >= 14) return current;
      return [...current, userId];
    });
  };

  const submitGroup = async () => {
    if (selectedUsers.length === 0) return;
    await onCreateGroup({
      name: groupName || "Group chat",
      userIds: selectedUsers,
    });
    setGroupMode(false);
    setGroupName("");
    setSelectedUsers([]);
    setTab("chats");
  };

  return (
    <>
    <aside
      className={`h-full w-full flex-col border-r border-slate-800 bg-slate-900 md:w-72 ${
        activeRoom ? "hidden md:flex" : "flex"
      }`}
    >
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowProfile(true)}
            className="flex min-w-0 items-center gap-2 rounded-md pr-2 text-left hover:bg-slate-800"
            title="Edit profile"
          >
            <Avatar user={currentUser} size="sm" />
            <span className="truncate font-semibold text-white text-sm">
              {currentUser.username}
            </span>
          </button>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-red-300 text-xs transition-colors"
          >
            Logout
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full bg-slate-950 text-sm text-white placeholder-slate-500 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="flex border-b border-slate-800">
        {["chats", "people"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "text-emerald-300 border-b-2 border-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "chats" ? (
          filteredRooms.length === 0 ? (
            <p className="text-slate-500 text-sm text-center mt-8">
              No chats yet — go to People to start one
            </p>
          ) : (
            filteredRooms.map((room) => {
              const other = getOtherMember(room);
              const isActive = activeRoom?._id === room._id;
              const title = getRoomTitle(room);
              return (
                <button
                  key={room._id}
                  onClick={() => onSelectRoom(room)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800 ${
                    isActive ? "bg-slate-800" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar
                      user={room.isGroup ? null : other}
                      name={getRoomInitial(room)}
                      size="md"
                    />
                    {!room.isGroup && isOnline(other?._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {title}
                    </p>
                    <p className="text-slate-500 text-xs truncate">
                      {getLastMessagePreview(room.lastMessage)}
                    </p>
                  </div>
                </button>
              );
            })
          )
        ) : (
          <>
            <div className="border-b border-slate-800 p-3">
              <button
                onClick={() => setGroupMode((value) => !value)}
                className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {groupMode ? "Cancel group" : "New group"}
              </button>

              {groupMode && (
                <div className="mt-3 space-y-2">
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    className="w-full rounded-md bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{selectedUsers.length + 1}/15 members</span>
                    <button
                      onClick={submitGroup}
                      disabled={selectedUsers.length === 0}
                      className="rounded bg-emerald-600 px-3 py-1 font-medium text-white disabled:opacity-40"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </div>

            {filteredUsers.map((u) => {
              const selected = selectedUsers.includes(u._id);
              return (
                <button
                  key={u._id}
                  onClick={() =>
                    groupMode ? toggleSelectedUser(u._id) : onOpenChat(u._id)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar
                      user={selected ? null : u}
                      name={selected ? "✓" : u.username}
                      size="md"
                      className={selected ? "bg-emerald-600" : ""}
                    />
                    {isOnline(u._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {u.username}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isOnline(u._id) ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </aside>
    {showProfile && (
      <ProfileModal
        user={currentUser}
        onClose={() => setShowProfile(false)}
        onUpdated={onProfileUpdated}
      />
    )}
    </>
  );
}
