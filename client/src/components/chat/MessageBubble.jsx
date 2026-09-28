import { useState } from "react";
import Avatar from "../common/Avatar";

const EMOJI_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const getPreviewText = (message) => {
  if (!message) return "";
  if (message.type === "payment") {
    const amt = message.payment?.amount ? `₹${(message.payment.amount / 100).toFixed(2)}` : "Payment";
    return `💰 ${amt}`;
  }
  if (message.type === "image") return "Image";
  if (message.type === "file") return message.fileName || "File";
  return message.content || "";
};

const renderTextWithMentions = (content, mentions = [], isOwn) => {
  if (!content) return null;
  const mentionNames = new Set(
    mentions.map((mention) => mention.username?.toLowerCase()).filter(Boolean)
  );

  return content.split(/(\s+)/).map((part, index) => {
    const clean = part
      .replace(/^@/, "")
      .replace(/[^\w.-]+$/g, "")
      .toLowerCase();

    if (part.startsWith("@") && mentionNames.has(clean)) {
      return (
        <span
          key={`${part}-${index}`}
          className={`rounded px-1 font-semibold ${
            isOwn ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-300"
          }`}
        >
          {part}
        </span>
      );
    }

    return part;
  });
};

export default function MessageBubble({
  message,
  isOwn,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onViewTransaction,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isImage = message.type === "image";
  const isFile = message.type === "file";
  const isPayment = message.type === "payment";

  const formattedSize = message.fileSize
    ? message.fileSize > 1024 * 1024
      ? `${(message.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(message.fileSize / 1024).toFixed(0)} KB`
    : "";

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const renderPaymentBubble = () => {
    const p = message.payment || {};
    const amountStr = p.amount ? (p.amount / 100).toFixed(2) : "0.00";
    const status = p.status || "success";

    return (
      <div className="min-w-[240px] max-w-sm rounded-xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-base font-bold text-emerald-400">
              ₹
            </span>
            <div>
              <p className="text-xs font-semibold text-emerald-300">
                {isOwn ? "Payment Sent" : "Payment Received"}
              </p>
              <p className="text-[10px] text-slate-400">
                {isOwn ? "Direct Transfer" : `From @${message.sender?.username}`}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              status === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : status === "refunded"
                ? "bg-purple-500/20 text-purple-400"
                : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="py-3 text-center">
          <p className="text-2xl font-black tracking-tight text-white">
            ₹{amountStr}
          </p>
          {p.note && (
            <p className="mt-1 text-xs italic text-slate-300">"{p.note}"</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-[11px]">
          <span className="font-mono text-slate-500">
            {p.transactionId ? p.transactionId.slice(0, 16) + "..." : "TXN"}
          </span>
          <button
            type="button"
            onClick={() =>
              onViewTransaction?.(
                p.transactionId
                  ? {
                      transactionId: p.transactionId,
                      amount: p.amount,
                      sender: message.sender,
                      recipient: { username: "Recipient" },
                      status: p.status,
                      note: p.note,
                      createdAt: message.createdAt,
                    }
                  : null
              )
            }
            className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            View details →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`group relative flex gap-2 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwn && (
        <Avatar user={message.sender} size="xs" className="mt-4 shrink-0" />
      )}

      <div
        className={`max-w-[85vw] sm:max-w-md ${
          isOwn ? "items-end" : "items-start"
        } flex flex-col`}
      >
        {!isOwn && (
          <span className="mb-1 ml-1 text-xs text-slate-400">
            {message.sender?.username}
          </span>
        )}

        {/* Pinned banner indicator if pinned */}
        {message.isPinned && (
          <div className="mb-1 flex items-center gap-1 text-[11px] text-amber-400">
            <span>📌</span>
            <span>Pinned message</span>
          </div>
        )}

        {/* Bubble body */}
        <div
          className={`relative rounded-2xl text-sm transition-all chat-bubble-shadow ${
            isPayment
              ? ""
              : isOwn
              ? "bg-emerald-600 text-white px-4 py-2.5"
              : "border border-slate-800 bg-slate-900 text-slate-200 px-4 py-2.5"
          }`}
        >
          {/* Reply reference */}
          {message.replyTo && (
            <div
              className={`mb-2 rounded-lg border-l-4 px-3 py-1.5 ${
                isOwn
                  ? "border-white/80 bg-black/20"
                  : "border-emerald-500 bg-slate-950"
              }`}
            >
              <p className="text-[11px] font-bold opacity-90">
                {message.replyTo.sender?.username || "Reply"}
              </p>
              <p className="truncate text-xs opacity-75">
                {getPreviewText(message.replyTo)}
              </p>
            </div>
          )}

          {/* Content rendering */}
          {isPayment ? (
            renderPaymentBubble()
          ) : isImage ? (
            <a
              href={message.fileUrl || message.content}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <img
                src={message.fileUrl || message.content}
                alt={message.fileName || "Shared image"}
                className="max-h-64 w-full rounded-xl object-cover"
                loading="lazy"
              />
              {message.fileName && (
                <span className="mt-1.5 block truncate text-xs opacity-80">
                  {message.fileName}
                </span>
              )}
            </a>
          ) : isFile ? (
            <a
              href={message.fileUrl || message.content}
              download={message.fileName}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 text-lg">
                📎
              </span>
              <div className="min-w-0">
                <span className="block truncate font-semibold">
                  {message.fileName || "Download file"}
                </span>
                {formattedSize && (
                  <span className="block text-[11px] opacity-75">
                    {formattedSize}
                  </span>
                )}
              </div>
            </a>
          ) : (
            <div className="break-words leading-relaxed">
              {renderTextWithMentions(message.content, message.mentions, isOwn)}
              {message.isEdited && (
                <span className="ml-1.5 text-[10px] italic opacity-70">
                  (edited)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reaction badges bar */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message, emoji)}
                className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-200 hover:border-emerald-500"
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp & Actions */}
        <div
          className={`mt-1 flex items-center gap-2 text-[11px] text-slate-500 ${
            isOwn ? "flex-row-reverse" : ""
          }`}
        >
          <span>{time}</span>
          {isOwn && <span className="text-emerald-400 font-bold">✓✓</span>}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setShowReactPicker((v) => !v)}
              className="rounded p-1 hover:bg-slate-800 hover:text-white"
              title="React"
            >
              😊
            </button>
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className="rounded p-1 hover:bg-slate-800 hover:text-white"
              title="Reply"
            >
              ↩
            </button>
            <button
              type="button"
              onClick={() => onPin?.(message)}
              className="rounded p-1 hover:bg-slate-800 hover:text-white"
              title={message.isPinned ? "Unpin" : "Pin"}
            >
              📌
            </button>
            {isOwn && !isPayment && (
              <button
                type="button"
                onClick={() => onEdit?.(message)}
                className="rounded p-1 hover:bg-slate-800 hover:text-white"
                title="Edit message"
              >
                ✏️
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete?.(message)}
              className="rounded p-1 hover:bg-slate-800 hover:text-red-400"
              title="Delete message"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Emoji reaction picker popover */}
        {showReactPicker && (
          <div className="absolute z-20 flex gap-1 rounded-full border border-slate-700 bg-slate-950 p-1.5 shadow-2xl">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact?.(message, emoji);
                  setShowReactPicker(false);
                }}
                className="h-7 w-7 rounded-full text-sm hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {isOwn && (
        <Avatar user={message.sender} size="xs" className="mt-2 shrink-0" />
      )}
    </div>
  );
}
