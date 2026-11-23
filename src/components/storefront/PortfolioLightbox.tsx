"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PortfolioItem } from "@/types";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";

interface PortfolioLightboxProps {
  portfolio: PortfolioItem[];
  businessName: string;
}

export function PortfolioLightbox({ portfolio, businessName }: PortfolioLightboxProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleNext = useCallback(() => {
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev! + 1) % portfolio.length);
  }, [selectedIdx, portfolio.length]);

  const handlePrev = useCallback(() => {
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev! - 1 + portfolio.length) % portfolio.length);
  }, [selectedIdx, portfolio.length]);

  // Keyboard navigation: Escape to close, Left/Right arrows to browse
  useEffect(() => {
    if (selectedIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIdx(null);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIdx, handleNext, handlePrev]);

  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400">
        No portfolio photos uploaded yet.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {portfolio.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => setSelectedIdx(idx)}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/90 cursor-pointer transition-all duration-300 hover:border-neutral-700 hover:scale-[1.01]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.caption || `${businessName} work ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ZoomIn className="w-5 h-5 drop-shadow-md" />
            </div>
            {item.caption && (
              <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-[11px] text-white truncate">
                {item.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIdx !== null && (
        <div
          onClick={() => setSelectedIdx(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in"
        >
          {/* Top Controls */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between text-xs text-neutral-400 font-mono z-10 max-w-4xl mx-auto">
            <span className="tabular-nums">
              {selectedIdx + 1} of {portfolio.length}
            </span>
            <button
              onClick={() => setSelectedIdx(null)}
              className="p-2 rounded-full bg-neutral-900/80 text-white hover:bg-neutral-800 transition-colors"
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Left Arrow */}
          {portfolio.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white transition-colors z-10"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Photo & Caption */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[82vh] w-full rounded-2xl overflow-hidden border border-neutral-800 flex flex-col items-center justify-center bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={portfolio[selectedIdx].image_url}
              alt={portfolio[selectedIdx].caption || `${businessName} full view`}
              className="max-h-[75vh] w-auto max-w-full object-contain"
            />
            {portfolio[selectedIdx].caption && (
              <div className="w-full px-4 py-3 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-300 text-center font-medium">
                {portfolio[selectedIdx].caption}
              </div>
            )}
          </div>

          {/* Right Arrow */}
          {portfolio.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white transition-colors z-10"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
