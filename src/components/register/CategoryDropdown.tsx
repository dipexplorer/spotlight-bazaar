"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  Code2,
  Coffee,
  Flower2,
  GraduationCap,
  ShoppingBag,
  Store,
  Wrench,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";
import { CATEGORY_PLOT_SPECS } from "@/lib/constants/categoryPlots";
import { CategoryId } from "@/types";

export const CATEGORY_ICONS: Record<CategoryId, React.ComponentType<{ className?: string }>> = {
  "creative-weddings": Camera,
  "beauty-wellness": Flower2,
  "food-hospitality": Coffee,
  "tech-freelance": Code2,
  "home-services": Wrench,
  "coaching-education": GraduationCap,
  "artisan-retail": ShoppingBag,
  "other-business": Store,
};

interface CategoryDropdownProps {
  id: string;
  value: CategoryId;
  onChange: (value: CategoryId) => void;
}

export function CategoryDropdown({ id, value, onChange }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(() =>
    Math.max(0, CATEGORIES.findIndex((c) => c.id === value))
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedCat = CATEGORIES.find((c) => c.id === value) || CATEGORIES[0];
  const selectedSpec = CATEGORY_PLOT_SPECS[selectedCat.id];
  const SelectedIcon = CATEGORY_ICONS[selectedCat.id];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = Math.max(0, CATEGORIES.findIndex((c) => c.id === value));
      setHighlightedIdx(idx);
    }
  }, [open, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % CATEGORIES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const chosen = CATEGORIES[highlightedIdx];
      if (chosen) {
        onChange(chosen.id);
        setOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-2.5">
      {/* Dropdown Trigger */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[56px] px-4 py-3 rounded-2xl bg-[#0d0d12] border text-left flex items-center justify-between gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          open
            ? "border-amber-400 ring-2 ring-amber-500/20 shadow-[0_0_24px_rgba(245,158,11,0.15)] bg-[#121218]"
            : "border-white/10 hover:border-white/20 hover:bg-[#111117]"
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <SelectedIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-100 truncate tracking-tight">
              {selectedCat.name}
            </div>
            <div className="text-xs text-neutral-400 truncate mt-0.5">
              3D Archetype: <span className="text-amber-200/90 font-medium">{selectedSpec.plotName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* 3-tone architectural material swatch */}
          <div className="flex items-center -space-x-1.5" aria-hidden="true">
            {selectedSpec.palette.map((hex, i) => (
              <span
                key={i}
                style={{ backgroundColor: hex }}
                className="w-3.5 h-3.5 rounded-full border-2 border-[#0d0d12] shadow-sm"
              />
            ))}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              open ? "rotate-180 text-amber-400" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover List */}
      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Business category"
          className="absolute z-40 left-0 right-0 mt-1 max-h-[340px] overflow-y-auto rounded-2xl bg-[#0d0d12]/98 backdrop-blur-xl border border-neutral-700/90 shadow-[0_16px_50px_rgba(0,0,0,0.9)] p-2 space-y-1"
        >
          {CATEGORIES.map((cat, idx) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const spec = CATEGORY_PLOT_SPECS[cat.id];
            const isSelected = cat.id === value;
            const isHighlighted = idx === highlightedIdx;

            return (
              <li key={cat.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  onClick={() => {
                    onChange(cat.id);
                    setOpen(false);
                  }}
                  className={`w-full min-h-[50px] px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? "bg-amber-500/20 border border-amber-500/40 text-white"
                      : isHighlighted
                        ? "bg-neutral-800/90 text-neutral-100"
                        : "text-neutral-200 hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-amber-500/25 border-amber-500/50 text-amber-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{cat.name}</div>
                      <div className="text-xs text-neutral-400 truncate mt-0.5">
                        {spec.plotName} · <span className="text-neutral-500">{spec.footprintLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center -space-x-1" aria-hidden="true">
                      {spec.palette.map((hex, i) => (
                        <span
                          key={i}
                          style={{ backgroundColor: hex }}
                          className="w-3 h-3 rounded-full border border-[#0d0d12]"
                        />
                      ))}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Quiet architectural blueprint confirmation strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-xl bg-[#0a0a0e] border border-amber-500/20 text-xs leading-relaxed shadow-sm">
        <div className="flex items-start gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0 animate-pulse" />
          <span className="text-neutral-300">
            <strong className="font-semibold text-amber-200">{selectedSpec.plotName}:</strong>{" "}
            {selectedSpec.architecturalStyle}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] font-medium text-amber-400/90 tabular-nums bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 self-start sm:self-auto">
          {selectedSpec.footprintLabel}
        </span>
      </div>
    </div>
  );
}

