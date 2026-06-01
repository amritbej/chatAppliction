export default function IncomingCall({ caller, callType, onAccept, onReject }) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-indigo-500 bg-[#1a1a2e] p-4 shadow-2xl shadow-indigo-900/50 sm:inset-x-auto sm:bottom-8 sm:right-8 sm:w-72 sm:rounded-2xl sm:p-6">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-3">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="w-16 h-16 rounded-full bg-indigo-600/40 flex items-center justify-center text-2xl">
            {callType === "video" ? "📹" : "📞"}
          </div>
        </div>

        <p className="text-white font-semibold text-lg">{caller?.username}</p>
        <p className="text-slate-400 text-sm mt-1">
          Incoming {callType} call...
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
          >
            ✅ Accept
          </button>
          <button
            onClick={onReject}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          >
            ❌ Decline
          </button>
        </div>
      </div>
    </div>
  );
}
