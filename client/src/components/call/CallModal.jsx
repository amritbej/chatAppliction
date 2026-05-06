import { useState } from "react";

export default function CallModal({
  callState,
  callType,
  localVideoRef,
  remoteVideoRef,
  remoteStreams = [],
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const handleMute = () => {
    onToggleMute();
    setMuted((v) => !v);
  };

  const handleVideo = () => {
    onToggleVideo();
    setVideoOff((v) => !v);
  };

  const RemoteVideo = ({ item }) => {
    const setRef = (node) => {
      if (node && node.srcObject !== item.stream) {
        node.srcObject = item.stream;
      }
    };

    return (
      <div className="relative min-h-40 overflow-hidden rounded-xl bg-slate-900">
        <video
          ref={setRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          {item.username || "Participant"}
        </span>
      </div>
    );
  };

  return (
    // Dark overlay covering the full screen
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
      {callState === "calling" && (
        <div className="text-white text-center mb-8 animate-pulse">
          <p className="text-2xl font-semibold">Calling...</p>
          <p className="text-slate-400 mt-2">Waiting for answer</p>
        </div>
      )}

      {/* Video elements */}
      {callType === "video" && (
        <div className="w-full max-w-5xl px-4">
          <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {remoteStreams.map((item) => (
              <RemoteVideo key={item.userId} item={item} />
            ))}
            <div className="relative min-h-40 overflow-hidden rounded-xl bg-slate-900 ring-2 ring-indigo-500">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded bg-indigo-600/80 px-2 py-1 text-xs text-white">
                You
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Audio call — just show a placeholder */}
      {callType === "audio" && callState === "connected" && (
        <div className="mb-8 grid max-w-2xl grid-cols-2 gap-4 px-4 sm:grid-cols-3">
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-2xl border border-indigo-500 bg-indigo-600/30 text-white">
            <span className="text-4xl">🎙️</span>
            <span className="mt-2 max-w-20 truncate text-xs">You</span>
          </div>
          {remoteStreams.map((item) => (
            <div
              key={item.userId}
              className="flex h-28 w-28 flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-white"
            >
              <span className="text-4xl">🎧</span>
              <span className="mt-2 max-w-20 truncate text-xs">
                {item.username || "Participant"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hidden audio element for audio calls */}
      {callType === "audio" && (
        <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
      )}

      {/* Controls */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${
            muted ? "bg-red-600" : "bg-slate-700 hover:bg-slate-600"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🎤"}
        </button>

        {callType === "video" && (
          <button
            onClick={handleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${
              videoOff ? "bg-red-600" : "bg-slate-700 hover:bg-slate-600"
            }`}
            title={videoOff ? "Turn on camera" : "Turn off camera"}
          >
            {videoOff ? "📵" : "📹"}
          </button>
        )}

        {/* Red hang-up button */}
        <button
          onClick={onEndCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-xl transition-colors"
          title="End call"
        >
          📵
        </button>
      </div>
    </div>
  );
}
