import Avatar from "../common/Avatar";

const getPreviewText = (message) => {
  if (!message) return "";
  if (message.type === "image") return "Image";
  if (message.type === "file") return message.fileName || "File";
  return message.content || "";
};

const renderTextWithMentions = (content, mentions = [], isOwn) => {
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
            isOwn ? "bg-white/15 text-white" : "bg-emerald-500/15 text-emerald-200"
          }`}
        >
          {part}
        </span>
      );
    }

    return part;
  });
};

export default function MessageBubble({ message, isOwn, onReply }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isImage = message.type === "image";
  const isFile = message.type === "file";

  const formattedSize = message.fileSize
    ? message.fileSize > 1024 * 1024
      ? `${(message.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(message.fileSize / 1024).toFixed(0)} KB`
    : "";

  return (
    <div
      className={`group flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {!isOwn && <Avatar user={message.sender} size="xs" className="mt-5 shrink-0" />}
      <div
        className={`max-w-[78vw] sm:max-w-xs lg:max-w-md ${
          isOwn ? "items-end" : "items-start"
        } flex flex-col`}
      >
        {!isOwn && (
          <span className="text-xs text-slate-400 mb-1 ml-1">
            {message.sender.username}
          </span>
        )}
        <div
          className={`px-4 py-2 rounded-lg text-sm overflow-hidden shadow-sm ${
            isOwn
              ? "bg-emerald-600 text-white"
              : "bg-slate-900 text-slate-200 border border-slate-800"
          }`}
        >
          {message.replyTo && (
            <div
              className={`mb-2 rounded-md border-l-4 px-3 py-2 ${
                isOwn
                  ? "border-white/60 bg-white/10"
                  : "border-emerald-500 bg-slate-950"
              }`}
            >
              <p className="text-xs font-semibold opacity-90">
                {message.replyTo.sender?.username || "Message"}
              </p>
              <p className="truncate text-xs opacity-75">
                {getPreviewText(message.replyTo)}
              </p>
            </div>
          )}

          {isImage ? (
            <a href={message.content} download={message.fileName} className="block">
              <img
                src={message.content}
                alt={message.fileName || "Shared image"}
                className="max-h-64 w-full rounded-lg object-cover"
              />
              {message.fileName && (
                <span className="mt-2 block truncate text-xs opacity-80">
                  {message.fileName}
                </span>
              )}
            </a>
          ) : isFile ? (
            <a
              href={message.content}
              download={message.fileName}
              className="flex min-w-0 items-center gap-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/20 text-lg">
                📎
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {message.fileName || "Download file"}
                </span>
                {formattedSize && (
                  <span className="block text-xs opacity-75">{formattedSize}</span>
                )}
              </span>
            </a>
          ) : (
            renderTextWithMentions(message.content, message.mentions, isOwn)
          )}
        </div>
        <div
          className={`mt-1 flex items-center gap-2 text-xs text-slate-500 ${
            isOwn ? "flex-row-reverse" : ""
          }`}
        >
          <span>{time}</span>
          <button
            type="button"
            onClick={() => onReply?.(message)}
            className="opacity-0 transition-opacity hover:text-emerald-300 group-hover:opacity-100"
          >
            Reply
          </button>
        </div>
      </div>
      {isOwn && <Avatar user={message.sender} size="xs" className="mt-1 shrink-0" />}
    </div>
  );
}
