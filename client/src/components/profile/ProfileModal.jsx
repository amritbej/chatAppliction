import { useRef, useState } from "react";
import Avatar from "../common/Avatar";
import api from "../../utils/api";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export default function ProfileModal({ user, onClose, onUpdated }) {
  const [username, setUsername] = useState(user.username || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for your profile photo.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError("Profile photo must be 2MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const { data } = await api.patch("/users/me", {
        username,
        avatar,
      });
      onUpdated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={saveProfile}
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit profile</h2>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close profile editor"
          >
            X
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <Avatar user={{ username, avatar }} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Upload photo
            </button>
            <button
              type="button"
              onClick={() => setAvatar("")}
              className="w-full rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
            >
              Remove photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-slate-400">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            minLength={3}
            maxLength={24}
            required
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-slate-400">
            Photo URL
          </span>
          <input
            value={avatar}
            onChange={(event) => setAvatar(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            placeholder="https://..."
          />
        </label>

        {error && (
          <div className="mb-4 rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
