"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface OwnerAuthCardProps {
  compact?: boolean;
  redirectNext?: string;
  onAuthenticated?: (user: { id: string; email: string; accessToken: string }) => void;
}

export function OwnerAuthCard({
  compact = false,
  redirectNext = "/dashboard",
  onAuthenticated,
}: OwnerAuthCardProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Authentication service is not configured.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (mode === "magic") {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`,
          },
        });
        if (error) throw error;
        setInfoMsg(`Sign-in link sent to ${cleanEmail}. Open the link in your inbox to continue.`);
        return;
      }

      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }

      if (mode === "signup") {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`,
          },
        });
        if (error) throw error;

        if (data.session && data.user) {
          onAuthenticated?.({
            id: data.user.id,
            email: data.user.email || cleanEmail,
            accessToken: data.session.access_token,
          });
        } else {
          setInfoMsg(
            `Account created for ${cleanEmail}. Check your email to confirm, then sign in.`
          );
        }
        return;
      }

      // Sign in with email + password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;

      if (data.session && data.user) {
        onAuthenticated?.({
          id: data.user.id,
          email: data.user.email || cleanEmail,
          accessToken: data.session.access_token,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setErrorMsg("Authentication service is not configured.");
      return;
    }
    setGoogleLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Google sign-in unavailable.";
      setErrorMsg(
        raw.toLowerCase().includes("provider")
          ? "Google sign-in is not enabled on this Supabase project yet. Use Email & Password below."
          : raw
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Authentication method"
        className="grid grid-cols-3 p-1 rounded-xl bg-[#121215] border border-neutral-800"
      >
        {(
          [
            { id: "signin", label: "Sign In" },
            { id: "signup", label: "Create Account" },
            { id: "magic", label: "Email Link" },
          ] as const
        ).map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setMode(tab.id);
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                active
                  ? "bg-amber-500 text-neutral-950"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-200 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div
          role="status"
          className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs text-emerald-200 flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{infoMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor={compact ? "inline-auth-email" : "auth-email"}
            className="block text-sm font-medium text-neutral-100"
          >
            Business Email <span className="text-amber-400">*</span>
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            <input
              id={compact ? "inline-auth-email" : "auth-email"}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@yourbusiness.in"
              className="w-full min-h-[46px] pl-10 pr-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
            />
          </div>
        </div>

        {mode !== "magic" && (
          <div className="space-y-1.5">
            <label
              htmlFor={compact ? "inline-auth-password" : "auth-password"}
              className="block text-sm font-medium text-neutral-100"
            >
              Password <span className="text-amber-400">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id={compact ? "inline-auth-password" : "auth-password"}
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                className="w-full min-h-[46px] pl-3.5 pr-11 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[46px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Please wait…</span>
            </>
          ) : mode === "magic" ? (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Send Sign-In Link</span>
            </>
          ) : mode === "signup" ? (
            <span>Create Owner Account</span>
          ) : (
            <span>Sign In to Dashboard</span>
          )}
        </button>
      </form>

      <div className="relative flex items-center py-0.5">
        <div className="flex-1 border-t border-neutral-800" />
        <span className="px-3 text-[11px] font-medium text-neutral-400">or</span>
        <div className="flex-1 border-t border-neutral-800" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full min-h-[46px] px-4 rounded-xl bg-[#121215] hover:bg-neutral-800/80 border border-neutral-800 text-neutral-100 text-sm font-medium flex items-center justify-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5.04c1.94 0 3.51.68 4.75 1.81l3.48-3.48C18.14 1.44 15.36.25 12 .25 7.31.25 3.26 2.94 1.29 6.86l4.05 3.14C6.31 7.12 8.93 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.72 2.89c2.17-2.01 3.7-4.96 3.7-8.71z"
            />
            <path
              fill="#FBBC05"
              d="M5.34 14.01a7.07 7.07 0 0 1 0-4.01L1.29 6.86A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.29 5.14l4.05-3.13z"
            />
            <path
              fill="#34A853"
              d="M12 23.75c3.24 0 5.96-1.07 7.95-2.91l-3.72-2.89c-1.07.72-2.45 1.15-4.23 1.15-3.07 0-5.69-2.08-6.66-4.96l-4.05 3.13C3.26 21.06 7.31 23.75 12 23.75z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>
    </div>
  );
}

