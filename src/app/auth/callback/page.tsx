"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const nextRaw = searchParams.get("next") || "/dashboard";
    const safeNext = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
    const code = searchParams.get("code");

    const finishAuth = async () => {
      if (!supabase) {
        setErrorMsg("Authentication service is not configured.");
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          await supabase.auth.getSession();
        }
        router.replace(safeNext);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Could not complete sign-in.");
      }
    };

    finishAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex items-center justify-center p-6">
      {errorMsg ? (
        <div className="max-w-sm w-full space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-white">Sign-in link expired</h1>
          <p className="text-sm text-neutral-400">{errorMsg}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          <span>Signing you into Spotlight Bazaar…</span>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-neutral-400 flex items-center justify-center text-sm">
          Signing in…
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

