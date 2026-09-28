import { useState } from "react";
import api from "../../utils/api";

export default function TransactionDetailsModal({
  transaction,
  currentUserId,
  onClose,
  onRefundSuccess,
}) {
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState("");
  const [refundedState, setRefundedState] = useState(transaction?.status === "refunded");

  if (!transaction) return null;

  const isSender =
    transaction.sender?._id?.toString() === currentUserId?.toString() ||
    transaction.sender?.toString() === currentUserId?.toString();

  const formattedAmount = (transaction.amount / 100).toFixed(2);
  const dateStr = new Date(transaction.createdAt).toLocaleString();

  const handleRefund = async () => {
    if (!confirm("Are you sure you want to refund this transaction?")) return;
    setRefunding(true);
    setError("");

    try {
      const { data } = await api.post(`/payments/${transaction.transactionId}/refund`, {
        reason: "User requested refund",
      });
      setRefundedState(true);
      onRefundSuccess?.(data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = refundedState ? "refunded" : status;
    switch (s) {
      case "success":
        return <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">Success</span>;
      case "pending":
      case "processing":
        return <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400">Pending</span>;
      case "refunded":
        return <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-bold text-purple-400">Refunded</span>;
      case "failed":
      default:
        return <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-400">Failed</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Transaction Details</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Large Amount card */}
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Amount</p>
          <p className="mt-1 text-3xl font-extrabold text-white">₹{formattedAmount}</p>
          <div className="mt-3 flex justify-center">{getStatusBadge(transaction.status)}</div>
        </div>

        {/* Key details table */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Transaction ID</span>
            <span className="font-mono text-xs text-slate-200">{transaction.transactionId}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">From</span>
            <span className="font-medium text-slate-200">
              @{transaction.sender?.username || "Sender"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">To</span>
            <span className="font-medium text-slate-200">
              @{transaction.recipient?.username || "Recipient"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Date & Time</span>
            <span className="text-slate-300 text-xs">{dateStr}</span>
          </div>

          {transaction.note && (
            <div className="flex justify-between">
              <span className="text-slate-400">Note</span>
              <span className="text-slate-200 italic max-w-[200px] truncate">{transaction.note}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-slate-400">Provider</span>
            <span className="capitalize text-slate-300">{transaction.provider}</span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          {isSender && transaction.status === "success" && !refundedState && (
            <button
              onClick={handleRefund}
              disabled={refunding}
              className="flex-1 rounded-xl border border-red-800/80 bg-red-950/30 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-900/50 disabled:opacity-50"
            >
              {refunding ? "Processing Refund..." : "Request Refund"}
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
