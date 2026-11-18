"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { OwnerAuthCard } from "@/components/auth/OwnerAuthCard";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(safeNext);
      }
    });
  }, [router, safeNext]);

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col">
      <header className="border-b border-neutral-800/80 bg-[#09090b]/92 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[44px] -ml-2 px-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to India Map</span>
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Claim a Plot</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight">
              Manage your 3D business plot
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Sign in to update rates, photos, website &amp; Google Maps links, and track real customer inquiries.
            </p>
          </div>

          <OwnerAuthCard
            redirectNext={safeNext}
            onAuthenticated={() => {
              router.replace(safeNext);
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-neutral-400 flex items-center justify-center text-sm">
          Loading sign-in…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

