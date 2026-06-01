import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { GOOGLE_AUTH_URL } from "../utils/config";
import { isValidEmail } from "../utils/validators";

const oauthErrors = {
  google_not_configured: "Google sign-in needs OAuth credentials on the server.",
  google_failed: "Google sign-in failed. Please try again.",
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const oauthError = oauthErrors[searchParams.get("error")];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const email = form.email.trim();

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { ...form, email });
      login(data);        
      navigate("/");       
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">ChatApp</h1>
          <p className="text-slate-400 mt-2">Sign in to your conversations</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 rounded-lg p-8 space-y-4 border border-slate-800 shadow-2xl"
        >
          {(error || oauthError) && (
            <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-2 rounded-md text-sm">
              {error || oauthError}
            </div>
          )}

          <a
            href={GOOGLE_AUTH_URL}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-slate-700 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 font-bold text-blue-600">
              G
            </span>
            Continue with Google
          </a>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            or
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() => {
                if (form.email && !isValidEmail(form.email)) {
                  setError("Please enter a valid email address.");
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-emerald-400 hover:underline">
              Forgot password?
            </Link>
          </div>

          <p className="text-center text-slate-400 text-sm">
            No account?{" "}
            <Link to="/register" className="text-emerald-400 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
