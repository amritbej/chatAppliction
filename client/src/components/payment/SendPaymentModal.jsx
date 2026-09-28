import { useState } from "react";
import api from "../../utils/api";
import Avatar from "../common/Avatar";

export default function SendPaymentModal({
  recipient,
  roomId,
  onClose,
  onPaymentSuccess,
}) {
  const [step, setStep] = useState("input"); 
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completedTxn, setCompletedTxn] = useState(null);

  const numAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numAmount) && numAmount >= 1;

  const quickAmounts = [100, 200, 500, 1000, 2000];

  const handleProceedToSummary = (e) => {
    e.preventDefault();
    if (!isValidAmount) {
      setError("Please enter a valid amount (minimum ₹1.00)");
      return;
    }
    setError("");
    setStep("summary");
  };

  const executePayment = async () => {
    setLoading(true);
    setError("");
    setStep("processing");

    try {
      // 1. Create Order on Backend
      const { data: orderRes } = await api.post("/payments/orders", {
        recipientId: recipient._id,
        roomId,
        amount: numAmount,
        note: note.trim(),
        idempotencyKey: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      const orderData = orderRes.data;

      // 2. Client Payment Gateway Trigger
      if (orderData.provider === "razorpay" && window.Razorpay && orderData.key) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "ChatApp Payment",
          description: note || `Payment to ${recipient.username}`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              // 3. Server Verification
              const { data: verifyRes } = await api.post("/payments/verify", {
                transactionId: orderData.transactionId,
                providerOrderId: response.razorpay_order_id,
                providerPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });

              setCompletedTxn(verifyRes.data);
              setStep("success");
              onPaymentSuccess?.(verifyRes.data);
            } catch (vErr) {
              setError(vErr.response?.data?.error?.message || "Payment verification failed");
              setStep("failed");
            }
          },
          modal: {
            ondismiss: () => {
              setError("Payment was cancelled");
              setStep("failed");
            },
          },
          theme: { color: "#10b981" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Mock Sandbox Payment Mode
        const { data: verifyRes } = await api.post("/payments/verify", {
          transactionId: orderData.transactionId,
          providerOrderId: orderData.orderId,
          providerPaymentId: `mock_pay_${Date.now()}`,
          signature: "mock_valid_signature",
          paymentMethod: "upi",
        });

        setCompletedTxn(verifyRes.data);
        setStep("success");
        onPaymentSuccess?.(verifyRes.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Payment could not be completed"
      );
      setStep("failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-bold">
              ₹
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Send Payment</h2>
              <p className="text-xs text-slate-400">Secure Direct Transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Input */}
        {step === "input" && (
          <form onSubmit={handleProceedToSummary} className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <Avatar user={recipient} size="sm" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Paying to</p>
                <p className="truncate text-sm font-semibold text-white">
                  @{recipient.username}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Amount (INR)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-2xl font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="100000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-10 pr-4 text-2xl font-bold text-white placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Quick amount chips */}
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for? (e.g. Dinner, Rent)"
                maxLength={100}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValidAmount}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              Continue to Review
            </button>
          </form>
        )}

        {/* Step 2: Summary */}
        {step === "summary" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Recipient</span>
                <span className="font-semibold text-white">@{recipient.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount</span>
                <span className="font-semibold text-white">₹{numAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Gateway Fee</span>
                <span className="font-semibold text-emerald-400">₹0.00 (Free)</span>
              </div>
              {note && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Note</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{note}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-3 flex justify-between text-base font-bold">
                <span className="text-white">Total Payable</span>
                <span className="text-emerald-400">₹{numAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={executePayment}
                disabled={loading}
                className="flex-[2] rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                Pay ₹{numAmount.toFixed(2)}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500" />
            <div>
              <p className="text-base font-semibold text-white">Verifying Transaction</p>
              <p className="text-xs text-slate-400 mt-1">
                Communicating with secure payment server...
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="py-4 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-400">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Payment Successful</h3>
              <p className="text-sm text-slate-300 mt-1">
                Sent <span className="font-bold text-emerald-400">₹{numAmount.toFixed(2)}</span> to @{recipient.username}
              </p>
              {completedTxn && (
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  Ref: {completedTxn.transactionId}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500"
            >
              Done
            </button>
          </div>
        )}

        {/* Step 5: Failed */}
        {step === "failed" && (
          <div className="py-4 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-2xl text-red-400">
              ✕
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Payment Failed</h3>
              <p className="text-sm text-red-300 mt-1">
                {error || "Your transaction could not be processed"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
