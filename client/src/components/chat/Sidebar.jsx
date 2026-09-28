import { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import Avatar from "../common/Avatar";
import ProfileModal from "../profile/ProfileModal";
import TransactionDetailsModal from "../payment/TransactionDetailsModal";
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
  const [tab, setTab] = useState("chats"); // "chats" | "people" | "payments"
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showProfile, setShowProfile] = useState(false);

  // Payments / Transactions tab state
  const [transactions, setTransactions] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({ totalSentINR: "0.00", totalReceivedINR: "0.00" });
  const [paymentFilter, setPaymentFilter] = useState("all"); // "all" | "sent" | "received"
  const [selectedTxn, setSelectedTxn] = useState(null);

  const { onlineUsers } = useSocket();

  useEffect(() => {
    if (tab === "people") fetchUsers();
    if (tab === "payments") fetchTransactions();
  }, [tab, paymentFilter]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data } = await api.get(`/payments?type=${paymentFilter}`);
      setTransactions(data.data?.transactions || []);
      setPaymentSummary(data.data?.summary || { totalSentINR: "0.00", totalReceivedINR: "0.00" });
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  };

  const getOtherMember = (room) =>
    room.members?.find((m) => m._id !== currentUser._id);

  const filteredRooms = rooms.filter((r) => {
    const other = getOtherMember(r);
    const label = r.isGroup ? r.name : other?.username;
    return label?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const isOnline = (userId) => onlineUsers.has(userId) || false;

  const getLastMessagePreview = (message) => {
    if (!message) return "Start chatting";
    if (message.type === "payment") {
      const amt = message.payment?.amount ? `₹${(message.payment.amount / 100).toFixed(2)}` : "Payment";
      return `💰 ${amt}`;
    }
    if (message.type === "image") return "📷 Image";
    if (message.type === "file") return `📎 ${message.fileName || "File"}`;
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
        className={`h-full w-full flex-col border-r border-slate-800/80 bg-slate-900 md:w-80 ${
          activeRoom ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowProfile(true)}
              className="flex min-w-0 items-center gap-2.5 rounded-xl p-1 text-left hover:bg-slate-800/60 transition"
              title="Edit Profile & Settings"
            >
              <Avatar user={currentUser} size="sm" />
              <div className="min-w-0">
                <span className="block truncate font-bold text-white text-sm">
                  {currentUser.displayName || currentUser.username}
                </span>
                <span className="block text-[11px] text-slate-400">
                  @{currentUser.username}
                </span>
              </div>
            </button>
            <button
              onClick={onLogout}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition"
            >
              Logout
            </button>
          </div>

          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          {[
            { id: "chats", label: "Chats" },
            { id: "payments", label: "Payments" },
            { id: "people", label: "People" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold transition ${
                tab === t.id
                  ? "border-b-2 border-emerald-400 text-emerald-400 bg-slate-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto">
          {/* Chats Tab */}
          {tab === "chats" && (
            filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No conversations yet. Open the "People" tab to start chatting!
              </div>
            ) : (
              filteredRooms.map((room) => {
                const other = getOtherMember(room);
                const isActive = activeRoom?._id === room._id;
                const title = getRoomTitle(room);
                return (
                  <button
                    key={room._id}
                    onClick={() => onSelectRoom(room)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/60 ${
                      isActive ? "bg-slate-800/90 border-l-4 border-emerald-400" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        user={room.isGroup ? null : other}
                        name={getRoomInitial(room)}
                        size="md"
                      />
                      {!room.isGroup && isOnline(other?._id) && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-bold text-white">{title}</p>
                        {room.lastMessage?.createdAt && (
                          <span className="text-[10px] text-slate-500">
                            {new Date(room.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-400 mt-0.5">
                        {getLastMessagePreview(room.lastMessage)}
                      </p>
                    </div>
                  </button>
                );
              })
            )
          )}

          {/* Payments Tab */}
          {tab === "payments" && (
            <div className="p-4 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-[11px] text-slate-400">Total Received</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">
                    ₹{paymentSummary.totalReceivedINR}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-[11px] text-slate-400">Total Sent</p>
                  <p className="mt-1 text-lg font-bold text-slate-200">
                    ₹{paymentSummary.totalSentINR}
                  </p>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2">
                {["all", "sent", "received"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setPaymentFilter(f)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                      paymentFilter === f
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Transaction List */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Recent Transactions
                </p>
                {transactions.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-500">
                    No transactions recorded yet
                  </p>
                ) : (
                  transactions.map((txn) => {
                    const isSender =
                      txn.sender?._id?.toString() === currentUser._id?.toString() ||
                      txn.sender?.toString() === currentUser._id?.toString();
                    const formattedAmt = (txn.amount / 100).toFixed(2);
                    return (
                      <button
                        key={txn.transactionId}
                        onClick={() => setSelectedTxn(txn)}
                        className="w-full flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-left hover:bg-slate-800/50 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                              isSender
                                ? "bg-slate-800 text-slate-300"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {isSender ? "↑" : "↓"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">
                              {isSender ? `To @${txn.recipient?.username}` : `From @${txn.sender?.username}`}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(txn.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-xs font-extrabold ${
                              isSender ? "text-slate-300" : "text-emerald-400"
                            }`}
                          >
                            {isSender ? `-₹${formattedAmt}` : `+₹${formattedAmt}`}
                          </p>
                          <span className="text-[9px] uppercase font-bold text-slate-500">
                            {txn.status}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* People Tab */}
          {tab === "people" && (
            <>
              <div className="border-b border-slate-800 p-3">
                <button
                  onClick={() => setGroupMode((v) => !v)}
                  className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  {groupMode ? "Cancel Group" : "+ Create New Group"}
                </button>

                {groupMode && (
                  <div className="mt-3 space-y-2">
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{selectedUsers.length + 1}/15 members</span>
                      <button
                        onClick={submitGroup}
                        disabled={selectedUsers.length === 0}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
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
                    onClick={() => (groupMode ? toggleSelectedUser(u._id) : onOpenChat(u._id))}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition text-left"
                  >
                    <div className="relative">
                      <Avatar
                        user={selected ? null : u}
                        name={selected ? "✓" : u.username}
                        size="md"
                        className={selected ? "bg-emerald-600" : ""}
                      />
                      {isOnline(u._id) && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {u.displayName || u.username}
                      </p>
                      <p className="text-xs text-slate-500">
                        @{u.username} • {isOnline(u._id) ? "Online" : "Offline"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </aside>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onUpdated={onProfileUpdated}
        />
      )}

      {/* Selected Transaction Details Modal */}
      {selectedTxn && (
        <TransactionDetailsModal
          transaction={selectedTxn}
          currentUserId={currentUser._id}
          onClose={() => setSelectedTxn(null)}
          onRefundSuccess={() => fetchTransactions()}
        />
      )}
    </>
  );
}
