import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { isValidEmail } from "../utils/validators";

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const email = form.email.trim();

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setOtpSent(true);
      setMessage(data.message || "Password reset OTP sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reset OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    const email = form.email.trim();

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email,
        otp: form.otp.trim(),
        password: form.password,
      });
      login(data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-400 mt-2">
            {otpSent ? "Enter your OTP and new password." : "Get an OTP sent to your email."}
          </p>
        </div>

        <form
          onSubmit={otpSent ? resetPassword : requestOtp}
          className="bg-slate-900 rounded-lg p-8 space-y-4 border border-slate-800 shadow-2xl"
        >
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-200 px-4 py-2 rounded-md text-sm">
              {message}
            </div>
          )}

          <div>
            <label className="text-sm text-slate-400 block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          {otpSent && (
            <>
              <div>
                <label className="text-sm text-slate-400 block mb-1">OTP</label>
                <input
                  value={form.otp}
                  onChange={(e) =>
                    updateForm("otp", e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white tracking-[0.35em] focus:outline-none focus:border-emerald-500 transition-colors"
                  inputMode="numeric"
                  placeholder="000000"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">New Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateForm("confirmPassword", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-colors"
          >
            {loading ? "Please wait..." : otpSent ? "Reset and Sign In" : "Send OTP"}
          </button>

          {otpSent && (
            <button
              type="button"
              onClick={requestOtp}
              disabled={loading}
              className="w-full border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50 font-semibold py-3 rounded-md transition-colors"
            >
              Resend OTP
            </button>
          )}

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
