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
      <div className="relative min-h-36 overflow-hidden rounded-lg bg-slate-900 sm:min-h-40 sm:rounded-xl">
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      {callState === "calling" && (
        <div className="mb-6 animate-pulse text-center text-white sm:mb-8">
          <p className="text-xl font-semibold sm:text-2xl">Calling...</p>
          <p className="text-slate-400 mt-2">Waiting for answer</p>
        </div>
      )}

      {callType === "video" && (
        <div className="w-full max-w-5xl">
          <div className="grid max-h-[72dvh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {remoteStreams.map((item) => (
              <RemoteVideo key={item.userId} item={item} />
            ))}
            <div className="relative min-h-36 overflow-hidden rounded-lg bg-slate-900 ring-2 ring-indigo-500 sm:min-h-40 sm:rounded-xl">
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

      
      {callType === "audio" && callState === "connected" && (
        <div className="mb-6 grid max-h-[66dvh] max-w-2xl grid-cols-2 gap-3 overflow-y-auto sm:mb-8 sm:grid-cols-3 sm:gap-4">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border border-indigo-500 bg-indigo-600/30 text-white sm:h-28 sm:w-28 sm:rounded-2xl">
            <span className="text-4xl">🎙️</span>
            <span className="mt-2 max-w-20 truncate text-xs">You</span>
          </div>
          {remoteStreams.map((item) => (
            <div
              key={item.userId}
              className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-white sm:h-28 sm:w-28 sm:rounded-2xl"
            >
              <span className="text-4xl">🎧</span>
              <span className="mt-2 max-w-20 truncate text-xs">
                {item.username || "Participant"}
              </span>
            </div>
          ))}
        </div>
      )}

      
      {callType === "audio" && (
        <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
      )}

      <div className="mt-5 flex shrink-0 gap-3 sm:mt-6 sm:gap-4">
        <button
          onClick={handleMute}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors sm:h-14 sm:w-14 ${
            muted ? "bg-red-600" : "bg-slate-700 hover:bg-slate-600"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🎤"}
        </button>

        {callType === "video" && (
          <button
            onClick={handleVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors sm:h-14 sm:w-14 ${
              videoOff ? "bg-red-600" : "bg-slate-700 hover:bg-slate-600"
            }`}
            title={videoOff ? "Turn on camera" : "Turn off camera"}
          >
            {videoOff ? "📵" : "📹"}
          </button>
        )}

        <button
          onClick={onEndCall}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-xl transition-colors hover:bg-red-700 sm:h-14 sm:w-14"
          title="End call"
        >
          📵
        </button>
      </div>
    </div>
  );
}
