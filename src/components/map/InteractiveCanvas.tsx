"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { Store, MapPin, Grid, Layers, ShieldCheck, Box } from "lucide-react";
import { BusinessStorefront, CategoryId, City } from "@/types";
import { CATEGORIES } from "@/lib/constants/categories";
import { INITIAL_CITIES } from "@/lib/constants/initialCities";
import { createStorefrontIcon } from "@/components/map/markerUtils";
import { StorefrontDrawer } from "@/components/map/StorefrontDrawer";
import { ThreeMapCanvas } from "@/components/map3d/ThreeMapCanvas";

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
  const [viewMode, setViewMode] = useState<"3d" | "2d" | "grid">("3d");

  // Fetch updated edge snapshot from /api/boot on mount
  useEffect(() => {
    fetch("/api/boot")
      .then((res) => res.json())
      .then((data) => {
        if (data.storefronts && Array.isArray(data.storefronts) && data.storefronts.length > 0) {
          if (typeof data.storefronts[0] === "object" && !Array.isArray(data.storefronts[0])) {
            setStorefronts(data.storefronts);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Handle URL deep-linking: ?city=guwahati&shop=studio-prism&new=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get("city");
    const shopSlug = params.get("shop");
    const isNew = params.get("new");

    if (cityParam) {
      const matched = INITIAL_CITIES.find(
        (c) =>
          c.slug.toLowerCase() === cityParam.toLowerCase() ||
          c.name.toLowerCase() === cityParam.toLowerCase()
      );
      if (matched) {
        handleCitySelect(matched.name);
      }
    }

    if (shopSlug && storefronts.length > 0) {
      const targetShop = storefronts.find(
        (s) => s.slug.toLowerCase() === shopSlug.toLowerCase()
      );
      if (targetShop) {
        setActiveStorefront(targetShop);
      }
    }

    if (isNew === "1") {
      import("canvas-confetti").then((m) => {
        m.default({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      });
    }
  }, [storefronts]);

  const filteredStorefronts = storefronts.filter((s) => {
    const matchesCategory = selectedCategory === "all" || s.category_id === selectedCategory;
    const matchesCity =
      selectedCity === "all" ||
      (Boolean(s?.city_name) && s.city_name.toLowerCase() === selectedCity.toLowerCase());
    return matchesCategory && matchesCity;
  });

  const selectedCityObject =
    selectedCity === "all"
      ? null
      : INITIAL_CITIES.find(
          (c) => c.name && c.name.toLowerCase() === selectedCity.toLowerCase()
        ) || null;

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    if (cityName === "all") {
      setMapCenter([22.5, 82.5]);
      setMapZoom(5);
    } else {
      const city = INITIAL_CITIES.find(
        (c) => c.name && c.name.toLowerCase() === cityName.toLowerCase()
      );
      if (city) {
        setMapCenter([city.lat, city.lon]);
        setMapZoom(13);
      }
    }
  };

  const handleCitySelectFrom3D = (city: City | null) => {
    if (city?.name) {
      handleCitySelect(city.name);
    } else {
      handleCitySelect("all");
    }
  };

  const handleMarkerClick = (storefront: BusinessStorefront) => {
    setActiveStorefront(storefront);
    setMapCenter([storefront.lat - 0.008, storefront.lon]);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070a13]">
      {/* 2D & Grid View Header Controls (Only rendered in 2D or Grid mode to avoid 3D canvas overlap) */}
      {viewMode !== "3d" && (
        <header className="w-full py-2 px-4 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800 z-30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/mascot.jpg"
              alt="Spotlight Mascot"
              className="w-7 h-7 rounded-lg object-cover border border-amber-500/40"
            />
            <span className="font-bold text-white text-sm">
              Spotlight <span className="text-amber-500">Bazaar</span>
            </span>
          </div>

          <div className="flex items-center p-1 rounded-2xl bg-neutral-900 border border-neutral-800 gap-0.5">
            <button
              onClick={() => setViewMode("3d")}
              className="px-3 py-1 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span>3D Globe</span>
            </button>
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "2d" ? "bg-amber-500 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Map</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "grid" ? "bg-amber-500 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>
          </div>

          <a
            href="/register"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/30"
          >
            <span>+ Open a Shop</span>
          </a>
        </header>
      )}

      {/* 2D & Grid View Filters Strip */}
      {viewMode !== "3d" && (
        <div className="p-3 z-20 flex flex-col gap-2 max-w-4xl mx-auto w-full pointer-events-none">
          {/* City Selector Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1.5 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800/90 shadow-2xl max-w-full pointer-events-auto no-scrollbar">
            <button
              onClick={() => handleCitySelect("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCity === "all"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              All India ({storefronts.length})
            </button>
            {INITIAL_CITIES.map((c) => {
              const count = storefronts.filter(
                (s) =>
                  s?.city_name &&
                  c?.name &&
                  s.city_name.toLowerCase() === c.name.toLowerCase()
              ).length;
              return (
                <button
                  key={c.id}
                  onClick={() => handleCitySelect(c.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedCity.toLowerCase() === c.name.toLowerCase()
                      ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
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
      )}

      {/* VIEWPORT AREA */}
      {viewMode === "3d" ? (
        /* VIEW 1: 3D INTERACTIVE INDIA GLOBE & BAZAAR STREET */
        <div className="w-full h-full relative overflow-hidden">
          <ThreeMapCanvas
            cities={INITIAL_CITIES}
            storefronts={storefronts}
            selectedCity={selectedCityObject}
            activeStorefront={activeStorefront}
            onCitySelect={handleCitySelectFrom3D}
            onStorefrontSelect={handleMarkerClick}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      ) : viewMode === "2d" ? (
        /* VIEW 2: 2D LEAFLET STREET MAP */
        <div className="w-full h-full relative overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ background: "#0a0a0c" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <MapCameraController center={mapCenter} zoom={mapZoom} />

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
        /* VIEW 3: CURATED DIRECTORY GRID */
        <div className="w-full h-full min-h-[88vh] p-6 pt-24 overflow-y-auto max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredStorefronts.map((storefront) => (
              <div
                key={storefront.id}
                onClick={() => handleMarkerClick(storefront)}
                className="group p-4 rounded-2xl bg-neutral-900/60 hover:bg-neutral-850/80 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-white group-hover:text-rose-400 transition-colors">
                      {storefront.name}
                    </h3>
                    {storefront.is_verified && (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                    {storefront.tagline}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-3 border-t border-neutral-800/60 text-neutral-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-neutral-500" />
                    <span>{storefront.city_name}</span>
                  </span>
                  <span className="font-semibold text-amber-400 font-mono">
                    {storefront.starting_price || "Direct"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storefront Slide-Over Drawer */}
      <StorefrontDrawer
        storefront={activeStorefront}
        onClose={() => setActiveStorefront(null)}
      />
    </div>
  );
}
