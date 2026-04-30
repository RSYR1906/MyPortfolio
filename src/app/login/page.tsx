"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created! You can now sign in.");
        setMode("signin");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Decorative background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[80px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm anim-modal-in">
        {/* Glass card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* Logo / title */}
          <div className="text-center mb-8">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-4">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 17l4-8 4 4 4-6 4 3"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 20h18"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
              Portfolio
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "signin"
                ? "Sign in to your account"
                : "Create a new account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <svg
                  className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            {message && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                <svg
                  className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-xs text-emerald-400">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-all shadow-lg shadow-blue-600/20 mt-1"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </span>
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-6">
            {mode === "signin"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setMessage(null);
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Feature hints */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {[
            { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", label: "Live prices" },
            {
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              label: "Portfolio",
            },
            {
              icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
              label: "News feed",
            },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/8 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <span className="text-[10px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
