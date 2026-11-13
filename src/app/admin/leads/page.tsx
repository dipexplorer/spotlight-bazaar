import Link from "next/link";
import { Store, Eye, MessageCircle, ShieldCheck, MapPin, ArrowUpRight, TrendingUp } from "lucide-react";
import { getStorefronts } from "@/lib/data/seedStorefronts";
import { createServerClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/constants/categories";
import { BusinessStorefront } from "@/types";

export const dynamic = "force-dynamic";

async function getAdminData(): Promise<BusinessStorefront[]> {
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
        .order("total_leads", { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as unknown) as BusinessStorefront[];
      }
    } catch {
      // Fallback
    }
  }
  return getStorefronts();
}

export default async function AdminLeadsPage() {
  const storefronts = await getAdminData();

  const totalStorefronts = storefronts.length;
  const totalViews = storefronts.reduce((acc, s) => acc + (s.total_views || 0), 0);
  const totalLeads = storefronts.reduce((acc, s) => acc + (s.total_leads || 0), 0);
  const verifiedCount = storefronts.filter((s) => s.is_verified).length;

  return (
    <main className="min-h-screen bg-[#09090b] text-neutral-100 p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Admin Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-400 tracking-tight">
              Spotlight Bazaar Command
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Lead Intelligence & Operations
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time telemetry across storefront activations, client page views, and direct WhatsApp inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="text-xs px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
          >
            Live Map
          </Link>
          <Link
            href="/register"
            className="text-xs font-bold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md shadow-amber-950/40"
          >
            + New Listing
          </Link>
        </div>
      </header>

      {/* Metric Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs">Active Storefronts</span>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{totalStorefronts}</span>
            <span className="text-xs text-neutral-400 ml-1.5">
              {totalStorefronts === 1 ? "business" : "businesses"}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs">Client Page Views</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{totalViews}</span>
            <span className="text-xs text-neutral-400 ml-1.5">impressions</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs">WhatsApp Leads Delivered</span>
            <MessageCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400 tabular-nums">{totalLeads}</span>
            <span className="text-xs text-neutral-400 ml-1.5">inquiries</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs">Verified Studios</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{verifiedCount}</span>
            <span className="text-xs text-neutral-400 ml-1.5">
              {verifiedCount === 1 ? "studio" : "studios"}
            </span>
          </div>
        </div>
      </section>

      {/* Top Performers Table */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Storefront Performance Leaderboard</span>
          </h2>
          <span className="text-xs text-neutral-400">Sorted by WhatsApp Leads</span>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-900/80 text-xs font-semibold text-neutral-300 border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4">Business</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Starting Rate</th>
                  <th className="py-3.5 px-4 text-right">Views</th>
                  <th className="py-3.5 px-4 text-right">WhatsApp Leads</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {storefronts.map((s) => {
                  const category = CATEGORIES.find((c) => c.id === s.category_id);
                  return (
                    <tr key={s.id} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0">
                            {s.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                <Store className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white">{s.name}</span>
                            {s.is_verified && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400">
                        {category?.name || "Business"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-neutral-300">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          {s.city_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-amber-400 tabular-nums font-medium">
                        {s.starting_price || "On Request"}
                      </td>
                      <td className="py-3.5 px-4 text-right text-neutral-300 tabular-nums">
                        {s.total_views}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums">
                        {s.total_leads}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/b/${s.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                        >
                          <span>View</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="pt-4 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
        <span>Spotlight Bazaar · Enterprise Telemetry</span>
        <span>Engineered by NERQIVA Digital Studio</span>
      </footer>
    </main>
  );
}
