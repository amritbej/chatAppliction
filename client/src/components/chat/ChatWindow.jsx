import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import api from "../../utils/api";
import Avatar from "../common/Avatar";
import MessageBubble from "./MessageBubble";
import SendPaymentModal from "../payment/SendPaymentModal";
import TransactionDetailsModal from "../payment/TransactionDetailsModal";

const EMOJIS = [
  "😀", "😂", "😍", "🥳", "😎", "😭", "👍", "🙏",
  "🔥", "✨", "❤️", "🎉", "💬", "✅", "👀", "🙌",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const mentionTokenRegex = /(^|\s)@([\w.-]*)$/;

const getPreviewText = (message) => {
  if (!message) return "";
  if (message.type === "payment") return `💰 Payment of ₹${((message.payment?.amount || 0) / 100).toFixed(2)}`;
  if (message.type === "image") return "Image";
  if (message.type === "file") return message.fileName || "File";
  return message.content || "";
};

export default function ChatWindow({
  room,
  currentUser,
  onStartCall,
  onMessageReceived,
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // Modals & Chat features
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { socket, onlineUsers } = useSocket();
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const otherUser = room.members?.find((m) => m._id !== currentUser._id);
  const roomTitle = room.isGroup ? room.name || "Group chat" : otherUser?.username;
  const onlineMemberCount =
    room.members?.filter(
      (member) => member._id !== currentUser._id && onlineUsers.has(member._id)
    ).length || 0;

  const mentionMatch = input.match(mentionTokenRegex);
  const mentionQuery = mentionMatch?.[2]?.toLowerCase();
  const mentionSuggestions =
    mentionQuery === undefined
      ? []
      : room.members
          ?.filter(
            (member) =>
              member._id !== currentUser._id &&
              member.username.toLowerCase().includes(mentionQuery)
          )
          .slice(0, 6) || [];

  const pinnedMessage = messages.find((m) => m.isPinned);

  // Fetch messages and join room
  useEffect(() => {
    if (!room?._id) return;
    api.get(`/messages/${room._id}`).then(({ data }) => setMessages(data));
    setInput("");
    setSelectedFile(null);
    setReplyTo(null);
    setShowEmojiPicker(false);
    setEditingMessage(null);
    setShowSearch(false);

    socket?.emit("room:join", room._id);

    return () => {
      socket?.emit("room:leave", room._id);
    };
  }, [room._id, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceive = (msg) => {
      setMessages((prev) => [...prev, msg]);
      onMessageReceived?.(msg);
    };

    const handleMessageEdited = (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    };

    const handleMessageDeleted = ({ messageId, mode }) => {
      if (mode === "for_everyone") {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, content: "This message was deleted" }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    };

    const handleMessageReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleMessagePinned = ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m))
      );
    };

    const handleTypingStart = ({ username }) => setTyping(username);
    const handleTypingStop = () => setTyping(null);

    socket.on("message:receive", handleMessageReceive);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("message:pinned", handleMessagePinned);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:receive", handleMessageReceive);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("message:pinned", handleMessagePinned);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, onMessageReceived]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const extractMentions = (content) =>
    room.members
      ?.filter((member) => {
        if (member._id === currentUser._id) return false;
        return content.toLowerCase().includes(`@${member.username.toLowerCase()}`);
      })
      .map((member) => member._id) || [];

  const selectMention = (member) => {
    setInput((value) => value.replace(mentionTokenRegex, `$1@${member.username} `));
    inputRef.current?.focus();
  };

  const startReply = (message) => {
    setReplyTo(message);
    inputRef.current?.focus();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    if (selectedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const { data: uploadRes } = await api.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const fileData = uploadRes.data;
        socket.emit("message:send", {
          roomId: room._id,
          content: fileData.url,
          type: fileData.mimeType?.startsWith("image/") ? "image" : "file",
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          fileUrl: fileData.url,
          replyTo: replyTo?._id,
        });

        setSelectedFile(null);
        setReplyTo(null);
        setFileError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        setFileError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
      return;
    }

    socket.emit("message:send", {
      roomId: room._id,
      content: input,
      replyTo: replyTo?._id,
      mentions: extractMentions(input),
    });

    setInput("");
    setReplyTo(null);
    socket.emit("typing:stop", { roomId: room._id });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    socket.emit("typing:start", { roomId: room._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { roomId: room._id });
    }, 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setFileError("File must be 10MB or smaller.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setFileError("");
    setShowEmojiPicker(false);
  };

  const handleReact = async (message, emoji) => {
    try {
      await api.post(`/messages/${message._id}/react`, { emoji });
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const handleTogglePin = async (message) => {
    try {
      await api.post(`/messages/${message._id}/pin`);
    } catch (err) {
      console.error("Failed to pin:", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInput.trim()) return;
    try {
      await api.patch(`/messages/${editingMessage._id}`, { content: editInput.trim() });
      setEditingMessage(null);
      setEditInput("");
    } catch (err) {
      alert("Failed to edit message");
    }
  };

  const handleDeleteConfirm = async (mode) => {
    if (!deleteTargetMessage) return;
    try {
      await api.delete(`/messages/${deleteTargetMessage._id}`, { data: { mode } });
      setMessages((prev) => prev.filter((m) => m._id !== deleteTargetMessage._id));
      setDeleteTargetMessage(null);
    } catch (err) {
      alert("Failed to delete message");
    }
  };

  const isOnline = onlineUsers.has(otherUser?._id);
  const canCall = room.isGroup || isOnline;

  const startRoomCall = (type) => {
    if (room.isGroup) {
      onStartCall({ roomId: room._id, roomName: roomTitle }, type);
    } else {
      onStartCall(otherUser._id, type);
    }
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="flex h-full min-w-0 flex-col bg-slate-950">
      {/* Top Navbar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/90 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 md:hidden hover:bg-slate-700"
            aria-label="Back to chats"
          >
            ←
          </button>
          <div className="relative">
            <Avatar user={room.isGroup ? null : otherUser} name={roomTitle} size="md" />
            {!room.isGroup && isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-white text-sm">{roomTitle}</p>
            <p className="text-xs text-slate-400">
              {room.isGroup
                ? `${room.members?.length || 0} members • ${onlineMemberCount} online`
                : isOnline
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch((v) => !v)}
            title="Search messages"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            🔍
          </button>

          {/* Pay Button (Direct Chat) */}
          {!room.isGroup && otherUser && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/50 transition"
              title="Send Payment"
            >
              <span>₹</span>
              <span className="hidden sm:inline">Pay</span>
            </button>
          )}

          {/* Audio Call */}
          <button
            onClick={() => startRoomCall("audio")}
            disabled={!canCall}
            title={canCall ? "Audio call" : "User is offline"}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              canCall
                ? "bg-slate-800 text-slate-200 hover:bg-emerald-600 hover:text-white"
                : "bg-slate-900 text-slate-600 cursor-not-allowed opacity-40"
            }`}
          >
            📞
          </button>

          {/* Video Call */}
          <button
            onClick={() => startRoomCall("video")}
            disabled={!canCall}
            title={canCall ? "Video call" : "User is offline"}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              canCall
                ? "bg-slate-800 text-slate-200 hover:bg-emerald-600 hover:text-white"
                : "bg-slate-900 text-slate-600 cursor-not-allowed opacity-40"
            }`}
          >
            📹
          </button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2 truncate">
            <span>📌</span>
            <span className="font-semibold text-amber-300">Pinned:</span>
            <span className="truncate">{getPreviewText(pinnedMessage)}</span>
          </div>
          <button
            onClick={() => handleTogglePin(pinnedMessage)}
            className="text-amber-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-2 flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search this conversation..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowSearch(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
        {filteredMessages.map((msg) => {
          const senderId = msg.sender?._id || msg.sender;
          const currentUserId = currentUser?._id || currentUser;
          const isOwnMessage =
            senderId && currentUserId && senderId.toString() === currentUserId.toString();

          return (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={isOwnMessage}
              onReply={startReply}
              onReact={handleReact}
              onEdit={(m) => {
                setEditingMessage(m);
                setEditInput(m.content);
              }}
              onDelete={(m) => setDeleteTargetMessage(m)}
              onPin={handleTogglePin}
              onViewTransaction={(txn) => setSelectedTxn(txn)}
            />
          );
        })}

        {typing && (
          <div className="text-xs italic text-slate-400 animate-pulse">
            {typing} is typing...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer Bottom Area */}
      <div className="border-t border-slate-800 bg-slate-900/90 pb-[env(safe-area-inset-bottom)]">
        {/* Reply preview */}
        {replyTo && (
          <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-xl border-l-4 border-emerald-500 bg-slate-950 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-400">
                Replying to {replyTo.sender?.username || "message"}
              </p>
              <p className="truncate text-xs text-slate-300">
                {getPreviewText(replyTo)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded p-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="relative flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6"
        >
          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-4 z-30 grid grid-cols-8 gap-1 rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInput((v) => `${v}${emoji}`);
                    setShowEmojiPicker(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-slate-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Mentions dropdown */}
          {mentionSuggestions.length > 0 && (
            <div className="absolute bottom-16 left-14 z-30 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
              {mentionSuggestions.map((member) => (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => selectMention(member)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-800 text-xs text-white"
                >
                  <Avatar user={member} size="xs" />
                  <span>@{member.username}</span>
                </button>
              ))}
            </div>
          )}

          {/* Selected File Badge */}
          {(selectedFile || fileError) && (
            <div className="absolute bottom-16 left-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-xl">
              {selectedFile ? (
                <div className="flex items-center gap-2 text-slate-200">
                  <span>📎</span>
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="text-red-400">{fileError}</p>
              )}
            </div>
          )}

          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="Emoji"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg hover:bg-slate-700 transition"
          >
            😊
          </button>

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach File"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg hover:bg-slate-700 transition"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Chat Pay Quick Button */}
          {!room.isGroup && otherUser && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              title="Send Payment"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 font-bold hover:bg-emerald-600/30 transition"
            >
              ₹
            </button>
          )}

          {/* Text Input */}
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message or @ to mention..."
            className="min-w-0 flex-1 rounded-xl border border-slate-700/80 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!input.trim() && !selectedFile) || uploading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold transition hover:bg-emerald-500 disabled:opacity-40"
          >
            {uploading ? "..." : "➤"}
          </button>
        </form>
      </div>

      {/* Send Payment Modal */}
      {showPaymentModal && otherUser && (
        <SendPaymentModal
          recipient={otherUser}
          roomId={room._id}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => setShowPaymentModal(false)}
        />
      )}

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <TransactionDetailsModal
          transaction={selectedTxn}
          currentUserId={currentUser._id}
          onClose={() => setSelectedTxn(null)}
        />
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Edit Message</h3>
            <textarea
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-500"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingMessage(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Modal */}
      {deleteTargetMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Message</h3>
            <p className="text-xs text-slate-400 mb-4">
              Choose how you want to delete this message:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleDeleteConfirm("for_me")}
                className="w-full rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Delete for Me
              </button>
              {deleteTargetMessage.sender?._id?.toString() === currentUser._id?.toString() && (
                <button
                  onClick={() => handleDeleteConfirm("for_everyone")}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={() => setDeleteTargetMessage(null)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
