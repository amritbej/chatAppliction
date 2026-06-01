const sizeClasses = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

const withAvatarVersion = (src, version) => {
  if (!src || !version || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  const [url, hash] = src.split("#");
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}avatarVersion=${encodeURIComponent(version)}${
    hash ? `#${hash}` : ""
  }`;
};

export default function Avatar({ user, name, size = "md", className = "" }) {
  const label = user?.username || name || "User";
  const initial = label?.[0]?.toUpperCase() || "U";
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const avatarSrc = withAvatarVersion(user?.avatar, user?.avatarVersion);

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 font-semibold text-white shadow-sm ${className}`}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={label}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {initial}
        </div>
      )}
    </div>
  );
}
