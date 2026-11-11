"use client";

import React, { useState } from "react";
import { Paintbrush, X, Check, Sparkles } from "lucide-react";
import { BusinessStorefront } from "@/types";
import { bazaarAudio } from "@/lib/audio/bazaarAudio";

interface StorefrontCustomizerModalProps {
  storefront: BusinessStorefront;
  isOpen: boolean;
  onClose: () => void;
  onApply: (customizations: {
    facadeColor: string;
    neonColor: string;
    rooftop: string;
  }) => void;
}

const FACADE_COLORS = [
  { name: "Jaipur Pink", hex: "#be185d" },
  { name: "Terracotta Earth", hex: "#c2410c" },
  { name: "Assam Teak", hex: "#78350f" },
  { name: "Urban Slate", hex: "#334155" },
  { name: "Pondicherry Gold", hex: "#d97706" },
  { name: "Emerald Mint", hex: "#047857" },
  { name: "Kashmir White", hex: "#f1f5f9" },
];

const NEON_COLORS = [
  { name: "Golden Amber", hex: "#f59e0b" },
  { name: "Cyber Cyan", hex: "#06b6d4" },
  { name: "Emerald Glow", hex: "#10b981" },
  { name: "Hot Rose", hex: "#f43f5e" },
  { name: "Royal Purple", hex: "#a855f7" },
];

const ROOFTOP_ITEMS = [
  { id: "sintex", name: "Sintex Tank", desc: "Black overhead storage" },
  { id: "solar", name: "Solar Grid", desc: "Rooftop photovoltaic" },
  { id: "terrace", name: "Terrace Garden", desc: "Potted botanical flora" },
];

export function StorefrontCustomizerModal({
  storefront,
  isOpen,
  onClose,
  onApply,
}: StorefrontCustomizerModalProps) {
  const [facadeColor, setFacadeColor] = useState(FACADE_COLORS[0].hex);
  const [neonColor, setNeonColor] = useState(NEON_COLORS[0].hex);
  const [rooftop, setRooftop] = useState(ROOFTOP_ITEMS[0].id);

  if (!isOpen) return null;

  const handleSave = () => {
    bazaarAudio.playStorefrontChime();
    onApply({
      facadeColor,
      neonColor,
      rooftop,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-neutral-950 border border-neutral-800 p-6 flex flex-col gap-4 shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Paint & Brand Storefront
              </h3>
              <p className="text-[11px] text-neutral-400">
                {storefront.name} · 3D Customizer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Facade Wall Color */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-300">
            Facade Wall Paint
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {FACADE_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setFacadeColor(c.hex)}
                className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                  facadeColor === c.hex ? "scale-110 border-white shadow-md" : "border-neutral-800 hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              >
                {facadeColor === c.hex && (
                  <Check className={`w-3.5 h-3.5 ${c.hex === "#f1f5f9" ? "text-neutral-900" : "text-white"}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Signboard Neon Glow */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-300">
            Signboard Neon Accent
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {NEON_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setNeonColor(c.hex)}
                className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                  neonColor === c.hex ? "scale-110 border-white shadow-md" : "border-neutral-800 hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              >
                {neonColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Rooftop Accessory */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-300">
            Rooftop Feature
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ROOFTOP_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRooftop(item.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                  rooftop === item.id
                    ? "bg-amber-500/10 border-amber-500/40 text-white"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <span className="text-xs font-semibold text-white">{item.name}</span>
                <span className="text-[10px] text-neutral-400 leading-tight">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Swatch Preview */}
        <div className="w-full p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl border border-white/20 shadow-inner flex items-end justify-center pb-1"
              style={{ backgroundColor: facadeColor }}
            >
              <div
                className="w-5 h-1.5 rounded-full"
                style={{ backgroundColor: neonColor, boxShadow: `0 0 8px ${neonColor}` }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">Live Palette</span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {FACADE_COLORS.find((c) => c.hex === facadeColor)?.name} + Neon Accent
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/30 mt-2"
        >
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}

