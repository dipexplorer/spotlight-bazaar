"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MapPin, Navigation, Check, Sparkles } from "lucide-react";
import { getCityGeoConfig } from "@/lib/geo/cityGeoRegistry";
import { unproject3DToGps } from "@/lib/geo/geoProjection";

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

export function LocationMapPicker({
  city,
  initialLat,
  initialLon,
  initialPincode,
  onLocationChange,
}: LocationMapPickerProps) {
  const geoConfig = useMemo(() => getCityGeoConfig(city), [city]);

  const presets: LandmarkPreset[] = useMemo(() => {
    return geoConfig.colonies.map((c) => {
      const rawGps = unproject3DToGps({ x: c.x, z: c.z }, geoConfig.anchor);
      return {
        name: c.name,
        pincode: c.pincode,
        lat: rawGps.lat,
        lon: rawGps.lon,
        area: c.description || c.zone,
      };
    });
  }, [geoConfig]);

  const defaultPreset = presets[0] || {
    name: "City Central Avenue",
    pincode: "781001",
    lat: geoConfig.anchor.centerLat,
    lon: geoConfig.anchor.centerLon,
    area: "Central Commercial District",
  };

  const [lat, setLat] = useState<number>(initialLat || defaultPreset.lat);
  const [lon, setLon] = useState<number>(initialLon || defaultPreset.lon);
  const [pincode, setPincode] = useState<string>(initialPincode || defaultPreset.pincode);
  const [selectedPreset, setSelectedPreset] = useState<string>(defaultPreset.name);
  const [gpsActive, setGpsActive] = useState<boolean>(false);

  // Update selection when city changes
  useEffect(() => {
    if (presets.length > 0) {
      const first = presets[0];
      setLat(first.lat);
      setLon(first.lon);
      setPincode(first.pincode);
      setSelectedPreset(first.name);
      onLocationChange({
        lat: first.lat,
        lon: first.lon,
        pincode: first.pincode,
        addressName: first.area,
      });
    }
  }, [city, presets, onLocationChange]);

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
          {presets.map((landmark) => {
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

