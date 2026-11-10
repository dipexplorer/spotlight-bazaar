"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { Store, MapPin, Grid, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { BusinessStorefront, CategoryId } from "@/types";
import { CATEGORIES } from "@/lib/constants/categories";
import { INITIAL_CITIES } from "@/lib/constants/initialCities";
import { createStorefrontIcon } from "@/components/map/markerUtils";
import { StorefrontDrawer } from "@/components/map/StorefrontDrawer";

interface InteractiveCanvasProps {
  initialStorefronts: BusinessStorefront[];
}

function MapCameraController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
}

export default function InteractiveCanvas({ initialStorefronts }: InteractiveCanvasProps) {
  const [storefronts, setStorefronts] = useState<BusinessStorefront[]>(initialStorefronts);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.5, 82.5]);
  const [mapZoom, setMapZoom] = useState<number>(5);
  const [activeStorefront, setActiveStorefront] = useState<BusinessStorefront | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "grid">("map");

  // Fetch updated edge snapshot from /api/boot on mount
  useEffect(() => {
    fetch("/api/boot")
      .then((res) => res.json())
      .then((data) => {
        if (data.storefronts && data.storefronts.length > 0) {
          // If live API returns more businesses, update
        }
      })
      .catch(() => {});
  }, []);

  const filteredStorefronts = storefronts.filter((s) => {
    const matchesCategory = selectedCategory === "all" || s.category_id === selectedCategory;
    const matchesCity = selectedCity === "all" || s.city_name.toLowerCase() === selectedCity.toLowerCase();
    return matchesCategory && matchesCity;
  });

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    if (cityName === "all") {
      setMapCenter([22.5, 82.5]);
      setMapZoom(5);
    } else {
      const city = INITIAL_CITIES.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
      if (city) {
        setMapCenter([city.lat, city.lon]);
        setMapZoom(13);
      }
    }
  };

  const handleMarkerClick = (storefront: BusinessStorefront) => {
    setActiveStorefront(storefront);
    // Offset center slightly to account for the bottom sheet
    setMapCenter([storefront.lat - 0.008, storefront.lon]);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#09090b]">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 z-20 flex flex-col gap-2 max-w-4xl mx-auto pointer-events-none">
        {/* City & View Switcher */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          {/* City Selector Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1.5 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800/90 shadow-2xl max-w-full no-scrollbar">
            <button
              onClick={() => handleCitySelect("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                selectedCity === "all"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              All India ({storefronts.length})
            </button>
            {INITIAL_CITIES.map((c) => {
              const count = storefronts.filter((s) => s.city_name.toLowerCase() === c.name.toLowerCase()).length;
              return (
                <button
                  key={c.id}
                  onClick={() => handleCitySelect(c.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedCity.toLowerCase() === c.name.toLowerCase()
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                >
                  <span>{c.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-800 text-neutral-300 font-mono tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Map vs Grid Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800/90 shadow-2xl shrink-0">
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-xl text-xs font-medium transition-all ${
                viewMode === "map"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Map View"
              aria-label="Switch to Map View"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl text-xs font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Grid View"
              aria-label="Switch to Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1.5 rounded-2xl bg-neutral-950/80 backdrop-blur-xl border border-neutral-800/80 shadow-2xl pointer-events-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all ${
              selectedCategory === "all"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: MAP */}
      {viewMode === "map" ? (
        <div className="w-full h-full min-h-[78vh] relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="w-full h-full"
          >
            <MapCameraController center={mapCenter} zoom={mapZoom} />

            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={19}
            />

            {filteredStorefronts.map((storefront) => (
              <Marker
                key={storefront.id}
                position={[storefront.lat, storefront.lon]}
                icon={createStorefrontIcon(storefront.category_id, storefront.is_featured)}
                eventHandlers={{
                  click: () => handleMarkerClick(storefront),
                }}
              />
            ))}
          </MapContainer>
        </div>
      ) : (
        /* VIEW: CURATED GRID */
        <div className="w-full max-w-5xl mx-auto p-4 pt-28 pb-32 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
          {filteredStorefronts.length === 0 ? (
            <div className="col-span-full py-20 text-center text-xs text-neutral-500">
              No storefronts found in this filter selection.
            </div>
          ) : (
            filteredStorefronts.map((s) => (
              <div
                key={s.id}
                onClick={() => handleMarkerClick(s)}
                className="group p-4 rounded-3xl bg-neutral-950 border border-neutral-850 hover:border-neutral-700 transition-all cursor-pointer flex flex-col justify-between shadow-lg shadow-black/60 hover:shadow-xl"
              >
                <div>
                  <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-900 mb-3 border border-neutral-800/80">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Store className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                      {s.name}
                    </h3>
                    {s.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>

                  {s.tagline && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                      {s.tagline}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-900 text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    {s.city_name}
                  </span>
                  <span className="font-semibold text-amber-400 tabular-nums">
                    {s.starting_price || "Rates on Request"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Storefront Slide-up Drawer */}
      <StorefrontDrawer
        storefront={activeStorefront}
        onClose={() => setActiveStorefront(null)}
      />
    </div>
  );
}
