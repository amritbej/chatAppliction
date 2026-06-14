
import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import api from "../../utils/api";
import Avatar from "../common/Avatar";
import MessageBubble from "./MessageBubble";

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥳",
  "😎",
  "😭",
  "👍",
  "🙏",
  "🔥",
  "✨",
  "❤️",
  "🎉",
  "💬",
  "✅",
  "👀",
  "🙌",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const mentionTokenRegex = /(^|\s)@([\w.-]*)$/;

const getPreviewText = (message) => {
  if (!message) return "";
  if (message.type === "image") return "Image";
  if (message.type === "file") return message.fileName || "File";
  return message.content || "";
};

const mergeUser = (user, updatedUser) =>
  user?._id === updatedUser._id ? { ...user, ...updatedUser } : user;

const updateMessageUser = (message, updatedUser) => ({
  ...message,
  sender: mergeUser(message.sender, updatedUser),
  mentions: message.mentions?.map((mention) => mergeUser(mention, updatedUser)),
  replyTo: message.replyTo
    ? {
        ...message.replyTo,
        sender: mergeUser(message.replyTo.sender, updatedUser),
      }
    : message.replyTo,
});

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const { socket, onlineUsers } = useSocket();
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const otherUser = room.members?.find((m) => m._id !== currentUser._id);
  const roomTitle = room.isGroup
    ? room.name || "Group chat"
    : otherUser?.username;
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

  
  useEffect(() => {
    if (!room?._id) return;
    api.get(`/messages/${room._id}`).then(({ data }) => setMessages(data));
    setInput("");
    setSelectedFile(null);
    setReplyTo(null);
    setShowEmojiPicker(false);

  
    socket?.emit("room:join", room._id);

    return () => {
      socket?.emit("room:leave", room._id);
    };
  }, [room._id, socket]);

  
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceive = (msg) => {
      setMessages((prev) => [...prev, msg]);
      onMessageReceived?.(msg);
    };

    const handleTypingStart = ({ username }) => {
      setTyping(username);
    };

    const handleTypingStop = () => setTyping(null);

    const handleUserUpdated = (updatedUser) => {
      setMessages((current) =>
        current.map((message) => updateMessageUser(message, updatedUser))
      );
    };

    socket.on("message:receive", handleMessageReceive);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("user:updated", handleUserUpdated);

    return () => {
      socket.off("message:receive", handleMessageReceive);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("user:updated", handleUserUpdated);
    };
  }, [socket, onMessageReceived]);

  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const extractMentions = (content) =>
    room.members
      ?.filter((member) => {
        if (member._id === currentUser._id) return false;
        return content
          .toLowerCase()
          .includes(`@${member.username.toLowerCase()}`);
      })
      .map((member) => member._id) || [];

  const selectMention = (member) => {
    setInput((value) =>
      value.replace(mentionTokenRegex, `$1@${member.username} `)
    );
    inputRef.current?.focus();
  };

  const startReply = (message) => {
    setReplyTo(message);
    inputRef.current?.focus();
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("message:send", {
          roomId: room._id,
          content: reader.result,
          type: selectedFile.type.startsWith("image/") ? "image" : "file",
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          replyTo: replyTo?._id,
        });
        setSelectedFile(null);
        setReplyTo(null);
        setFileError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        socket.emit("typing:stop", { roomId: room._id });
      };
      reader.readAsDataURL(selectedFile);
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
      setFileError("File must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setFileError("");
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji) => {
    setInput((value) => `${value}${emoji}`);
    setShowEmojiPicker(false);
  };

  const isOnline = onlineUsers.has(otherUser?._id);
  const canCall = room.isGroup || isOnline;

  const startRoomCall = (type) => {
    if (room.isGroup) {
      onStartCall(
        {
          roomId: room._id,
          roomName: roomTitle,
        },
        type
      );
      return;
    }

    onStartCall(otherUser._id, type);
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
    
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-lg text-slate-200 md:hidden"
            aria-label="Back to chats"
          >
            ←
          </button>
          <div className="relative">
            <Avatar user={room.isGroup ? null : otherUser} name={roomTitle} />
            {!room.isGroup && isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{roomTitle}</p>
            <p className="text-xs text-slate-400">
              {room.isGroup
                ? `${room.members?.length || 0} members • ${onlineMemberCount} online`
                : isOnline
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => startRoomCall("audio")}
            disabled={!canCall}
            title={canCall ? "Audio call" : "User is offline"}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              canCall
                ? "bg-slate-800 text-slate-200 hover:bg-emerald-700 hover:text-white"
                : "bg-slate-900 text-slate-600 cursor-not-allowed opacity-40"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.18.283-.105.432a10.982 10.982 0 0 0 5.86 5.86c.15.074.331.03.432-.105l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => startRoomCall("video")}
            disabled={!canCall}
            title={canCall ? "Video call" : "User is offline"}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              canCall
                ? "bg-slate-800 text-slate-200 hover:bg-emerald-700 hover:text-white"
                : "bg-slate-900 text-slate-600 cursor-not-allowed opacity-40"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3V7.5a3 3 0 0 0-3-3H4.5Z" />
              <path d="M19.125 7.904c-.397-.24-.875-.018-.875.447v7.298c0 .465.478.687.875.447l3.75-2.25a.525.525 0 0 0 0-.894l-3.75-2.25Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
        {messages.map((msg) => {
          const senderId = msg.sender?._id || msg.sender;
          const currentUserId = currentUser?._id || currentUser;
          const isOwnMessage = senderId && currentUserId && senderId.toString() === currentUserId.toString();
          return (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={isOwnMessage}
              onReply={startReply}
            />
          );
        })}

        {typing && (
          <div className="text-slate-400 text-sm italic">
            {typing} is typing...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)]">
        {replyTo && (
          <div className="mx-3 mt-3 flex items-start justify-between gap-3 rounded-md border-l-4 border-emerald-500 bg-slate-950 px-3 py-2 sm:mx-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-300">
                Replying to {replyTo.sender?.username || "message"}
              </p>
              <p className="truncate text-sm text-slate-300">
                {getPreviewText(replyTo)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded px-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Cancel reply"
            >
              X
            </button>
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="relative flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4"
        >
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-3 right-3 grid grid-cols-8 gap-1 rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-xl sm:bottom-20 sm:left-6 sm:right-auto sm:w-64">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-slate-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {mentionSuggestions.length > 0 && (
            <div className="absolute bottom-16 left-3 right-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-xl sm:bottom-20 sm:left-36 sm:right-auto sm:w-64">
              {mentionSuggestions.map((member) => (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => selectMention(member)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-800"
                >
                  <Avatar user={member} size="xs" />
                  <span className="text-sm text-slate-100">
                    @{member.username}
                  </span>
                </button>
              ))}
            </div>
          )}

          {(selectedFile || fileError) && (
            <div className="absolute bottom-16 left-3 right-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm shadow-xl sm:bottom-20 sm:left-auto sm:right-6 sm:max-w-xs">
              {selectedFile ? (
                <div className="flex min-w-0 items-center gap-2 text-slate-200">
                  <span>📎</span>
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-slate-400 hover:text-white"
                    title="Remove file"
                  >
                    X
                  </button>
                </div>
              ) : (
                <p className="text-red-300">{fileError}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowEmojiPicker((value) => !value)}
            title="Add emoji"
            className="h-11 w-11 shrink-0 rounded-md bg-slate-950 text-lg transition-colors hover:bg-slate-800 sm:h-12 sm:w-12"
          >
            😊
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            className="h-11 w-11 shrink-0 rounded-md bg-slate-950 text-lg transition-colors hover:bg-slate-800 sm:h-12 sm:w-12"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Message or type @ to mention"
            className="min-w-0 flex-1 rounded-md bg-slate-950 px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:px-4"
          />
          <button
            type="submit"
            disabled={!input.trim() && !selectedFile}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-lg transition-colors hover:bg-emerald-500 disabled:opacity-40 sm:h-12 sm:w-12"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
