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
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 shadow-inner">
          <Coffee className="w-6 h-6 text-amber-400" />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-300 mb-2">
          <span>{cityName} High Street Stall</span>
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight mb-1">
          Fresh Cutting Chai
        </h3>

        <p className="text-xs text-neutral-400 leading-relaxed mb-4 max-w-xs">
          Brewed on the sidewalk burner with whole cardamom, crushed ginger, and strong Assam CTC leaf.
        </p>

        {/* Perk Card */}
        <div className="w-full p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3 text-left mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">2x Walking Speed</div>
            <div className="text-[11px] text-neutral-400">Pace boost enabled for 60 seconds.</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/30"
        >
          <span>Drink Chai & Continue</span>
        </button>
      </div>
    </div>
  );
}

