import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function OAuthCallback() {
  const [message, setMessage] = useState("Completing Google sign-in...");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login?error=google_failed", { replace: true });
      return;
    }

    const finishLogin = async () => {
      try {
        const { data } = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        login({ ...data, token });
        navigate("/", { replace: true });
      } catch {
        setMessage("Google sign-in could not be completed.");
        navigate("/login?error=google_failed", { replace: true });
      }
    };

    finishLogin();
  }, [login, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="rounded-lg border border-slate-800 bg-slate-900 px-6 py-5 text-sm shadow-xl">
        {message}
      </div>
    </div>
  );
}
