"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Navigation, Check, Sparkles } from "lucide-react";

interface LocationMapPickerProps {
  city: string;
  initialLat?: number;
  initialLon?: number;
  initialPincode?: string;
  onLocationChange: (loc: { lat: number; lon: number; pincode: string; addressName: string }) => void;
}

interface LandmarkPreset {
  name: string;
  pincode: string;
  lat: number;
  lon: number;
  area: string;
}

const GUWAHATI_LANDMARKS: LandmarkPreset[] = [
  {
    name: "GS Road & Christian Basti",
    pincode: "781005",
    lat: 26.1550,
    lon: 91.7750,
    area: "Christian Basti Commercial Boulevard",
  },
  {
    name: "Pan Bazar Riverfront",
    pincode: "781001",
    lat: 26.1850,
    lon: 91.7450,
    area: "Pan Bazar Riverfront & Cotton Univ",
  },
  {
    name: "Uzan Bazar Lakefront",
    pincode: "781004",
    lat: 26.1900,
    lon: 91.7650,
    area: "Dighalipukhuri Heritage Promenade",
  },
  {
    name: "Paltan Bazar Junction",
    pincode: "781008",
    lat: 26.1720,
    lon: 91.7520,
    area: "Guwahati Railway Junction / Transit Hub",
  },
  {
    name: "Dispur Secretariat",
    pincode: "781006",
    lat: 26.1280,
    lon: 91.8040,
    area: "Capital Commercial District",
  },
  {
    name: "Zoo Road & Chandmari",
    pincode: "781003",
    lat: 26.1680,
    lon: 91.7850,
    area: "R.G. Baruah Road Media & Retail Spine",
  },
  {
    name: "Ganeshguri Commercial Center",
    pincode: "781005",
    lat: 26.1380,
    lon: 91.7940,
    area: "Ganeshguri Flyover Retail Hub",
  },
  {
    name: "Jalukbari Gateway",
    pincode: "781014",
    lat: 26.1500,
    lon: 91.6850,
    area: "Saraighat Bridge & Gauhati University",
  },
];

export function LocationMapPicker({
  city,
  initialLat = 26.1550,
  initialLon = 91.7750,
  initialPincode = "781005",
  onLocationChange,
}: LocationMapPickerProps) {
  const [lat, setLat] = useState<number>(initialLat);
  const [lon, setLon] = useState<number>(initialLon);
  const [pincode, setPincode] = useState<string>(initialPincode);
  const [selectedPreset, setSelectedPreset] = useState<string>("GS Road & Christian Basti");
  const [gpsActive, setGpsActive] = useState<boolean>(false);

  // Trigger initial change
  useEffect(() => {
    onLocationChange({
      lat,
      lon,
      pincode,
      addressName: selectedPreset,
    });
  }, []);

  const handlePresetSelect = (preset: LandmarkPreset) => {
    setLat(preset.lat);
    setLon(preset.lon);
    setPincode(preset.pincode);
    setSelectedPreset(preset.name);
    setGpsActive(false);

    onLocationChange({
      lat: preset.lat,
      lon: preset.lon,
      pincode: preset.pincode,
      addressName: preset.area,
    });
  };

  const handleGetCurrentLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setGpsActive(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = Number(pos.coords.latitude.toFixed(6));
          const userLon = Number(pos.coords.longitude.toFixed(6));
          setLat(userLat);
          setLon(userLon);
          setSelectedPreset("Current Live GPS Location");

          onLocationChange({
            lat: userLat,
            lon: userLon,
            pincode,
            addressName: `Physical GPS Location (${userLat.toFixed(4)}, ${userLon.toFixed(4)})`,
          });
        },
        () => {
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-neutral-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            3D High Street Anchor & Real GPS Coordinates
          </span>
        </div>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors active:scale-95"
        >
          <Navigation className={`w-3.5 h-3.5 ${gpsActive ? "animate-spin text-amber-400" : ""}`} />
          <span>Use My GPS</span>
        </button>
      </div>

      <p className="text-[11px] text-neutral-400">
        Your 3D storefront will spawn dynamically on the real 3D street matching your physical shop or studio address.
      </p>

      {/* Preset Landmark / Postal Hub Grid */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
          Select Landmark & Postal PIN Zone in {city}:
        </span>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
          {GUWAHATI_LANDMARKS.map((landmark) => {
            const isSelected = selectedPreset === landmark.name;
            return (
              <button
                type="button"
                key={landmark.name}
                onClick={() => handlePresetSelect(landmark)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-950/20"
                    : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-white truncate">
                    {landmark.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>PIN {landmark.pincode}</span>
                  <span className="text-[9px] text-amber-400/80">
                    {landmark.lat.toFixed(2)}, {landmark.lon.toFixed(2)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* GPS Live Readout Pill */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-neutral-400 text-[11px]">Real 3D Anchor:</span>
          <span className="text-white font-semibold">
            {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
          </span>
        </div>
        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
          PIN {pincode}
        </span>
      </div>
    </div>
  );
}
