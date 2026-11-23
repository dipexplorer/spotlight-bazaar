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
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleNext = useCallback(() => {
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev! + 1) % portfolio.length);
  }, [selectedIdx, portfolio.length]);

  const handlePrev = useCallback(() => {
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev! - 1 + portfolio.length) % portfolio.length);
  }, [selectedIdx, portfolio.length]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStart(null);
  };

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
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-white/10 text-center text-xs text-neutral-400">
        No portfolio photos uploaded yet.
      </div>
    );
  }

  const isThreeItems = portfolio.length === 3;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {portfolio.map((item, idx) => {
          const isFeatured = isThreeItems && idx === 0;
          return (
            <div
              key={item.id || idx}
              onClick={() => setSelectedIdx(idx)}
              className={`group relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer transition-all duration-300 hover:border-amber-500/40 active:scale-[0.99] ${
                isFeatured
                  ? "col-span-2 aspect-[16/10] sm:col-span-1 sm:aspect-square"
                  : "aspect-square"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.caption || `${businessName} work ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="w-5 h-5 drop-shadow-md text-amber-300" />
              </div>
              {item.caption && (
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-xs text-white truncate font-medium">
                  {item.caption}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedIdx !== null && (
        <div
          onClick={() => setSelectedIdx(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fade-in"
        >
          {/* Top Controls */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between text-xs text-neutral-300 font-mono z-10 max-w-4xl mx-auto">
            <span className="tabular-nums px-2.5 py-1 rounded-full bg-neutral-900/90 border border-white/10">
              {selectedIdx + 1} of {portfolio.length}
            </span>
            <button
              onClick={() => setSelectedIdx(null)}
              className="w-10 h-10 rounded-full bg-neutral-900/90 border border-white/10 text-white hover:bg-neutral-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Left Arrow (Desktop / Tablet) */}
          {portfolio.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="hidden sm:flex absolute left-4 w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 text-white items-center justify-center transition-colors z-10"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Photo & Caption */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[82vh] w-full rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center bg-[#09090c]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={portfolio[selectedIdx].image_url}
              alt={portfolio[selectedIdx].caption || `${businessName} full view`}
              className="max-h-[72vh] w-auto max-w-full object-contain"
            />
            {portfolio[selectedIdx].caption && (
              <div className="w-full px-4 py-3 bg-[#0c0c10] border-t border-white/10 text-xs sm:text-sm text-neutral-200 text-center font-medium">
                {portfolio[selectedIdx].caption}
              </div>
            )}
          </div>

          {/* Right Arrow (Desktop / Tablet) */}
          {portfolio.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="hidden sm:flex absolute right-4 w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 text-white items-center justify-center transition-colors z-10"
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
