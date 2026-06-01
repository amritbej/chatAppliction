import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { isValidEmail } from "../utils/validators";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("Enter the OTP sent to your email.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-email", {
        email: normalizedEmail,
        otp: otp.trim(),
      });
      login(data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Email verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/resend-verification", {
        email: normalizedEmail,
      });
      setMessage(data.message || "Verification OTP sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Verify Email</h1>
          <p className="text-slate-400 mt-2">{message}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 rounded-lg p-8 space-y-4 border border-slate-800 shadow-2xl"
        >
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-slate-400 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white tracking-[0.35em] focus:outline-none focus:border-emerald-500 transition-colors"
              inputMode="numeric"
              placeholder="000000"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-colors"
          >
            {loading ? "Verifying..." : "Verify and Sign In"}
          </button>

          <button
            type="button"
            onClick={resendOtp}
            disabled={loading}
            className="w-full border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50 font-semibold py-3 rounded-md transition-colors"
          >
            Resend OTP
          </button>

          <p className="text-center text-slate-400 text-sm">
            Back to{" "}
            <Link to="/login" className="text-emerald-400 hover:underline">
              login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
