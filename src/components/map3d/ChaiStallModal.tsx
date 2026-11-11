"use client";

import React from "react";
import { Coffee, Zap, X, Sparkles } from "lucide-react";

interface ChaiStallModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
}

export function ChaiStallModal({ isOpen, onClose, cityName }: ChaiStallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-neutral-950 border border-amber-500/30 p-6 flex flex-col items-center shadow-2xl shadow-amber-950/40 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Steaming Chai Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-3 shadow-inner">
          <Coffee className="w-7 h-7 text-amber-400 animate-bounce" />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-400 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{cityName} Cutting Chai Stall</span>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight mb-1">
          Chai Garam! Ek Cutting!
        </h3>

        <p className="text-xs text-neutral-300 leading-relaxed mb-4">
          Freshly brewed strong Assam CTC tea with crushed cardamom, ginger, and malai. Served piping hot in authentic glass tumblers.
        </p>

        {/* Perk Card */}
        <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center gap-3 text-left mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-neutral-950 font-bold shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300">2x Walking Speed Activated!</div>
            <div className="text-[11px] text-neutral-400">Glide through the 3D high street twice as fast for the next 60 seconds.</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
        >
          <span>Sip & Continue Strolling 🚶💨</span>
        </button>
      </div>
    </div>
  );
}

