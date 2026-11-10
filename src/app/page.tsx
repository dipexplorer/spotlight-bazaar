import Link from "next/link";
import { Store, Plus } from "lucide-react";
import { SEED_STOREFRONTS } from "@/lib/data/seedStorefronts";
import { createServerClient } from "@/lib/supabase/server";
import { BusinessStorefront } from "@/types";
import { MapWrapper } from "@/components/map/MapWrapper";

async function getInitialStorefronts(): Promise<BusinessStorefront[]> {
  const supabase = createServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          id, slug, name, tagline, description, category_id, city_name, state_name,
          pincode, lat, lon, whatsapp_phone, starting_price, logo_url, is_verified, is_featured,
          total_views, total_leads, created_at
        `)
        .eq("status", "active")
        .order("is_featured", { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as unknown) as BusinessStorefront[];
      }
    } catch {
      // Fallback to seeds
    }
  }
  return SEED_STOREFRONTS;
}

export default async function Home() {
  const storefronts = await getInitialStorefronts();

  return (
    <main className="flex min-h-screen flex-col bg-[#09090b] text-neutral-100 overflow-hidden">
      {/* Top Navbar */}
      <header className="w-full h-14 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center">
            <Store className="w-4 h-4 text-rose-500" />
          </div>
          <span className="font-bold tracking-tight text-white text-sm">
            Spotlight <span className="text-rose-500 font-semibold">Bazaar</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
            India Open Street
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>DAY 1 · {storefronts.length} Active Storefronts</span>
          </div>

          <Link
            href="/register"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-rose-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Claim Storefront</span>
          </Link>
        </div>
      </header>

      {/* Main Interactive Map Container */}
      <div className="flex-1 w-full relative">
        <MapWrapper storefronts={storefronts} />
      </div>
    </main>
  );
}
