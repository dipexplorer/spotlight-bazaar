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
    <div ref={containerRef} className="relative space-y-2">
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
        className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-xl bg-[#121215] border text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          open
            ? "border-amber-500/75"
            : "border-neutral-800 hover:border-neutral-700"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/12 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <SelectedIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-100 truncate">
              {selectedCat.name}
            </div>
            <div className="text-xs text-neutral-400 truncate">
              Base 3D Plot: <span className="text-neutral-200">{selectedSpec.plotName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* 3-tone architectural material swatch */}
          <div className="hidden sm:flex items-center -space-x-1" aria-hidden="true">
            {selectedSpec.palette.map((hex, i) => (
              <span
                key={i}
                style={{ backgroundColor: hex }}
                className="w-3.5 h-3.5 rounded-full border border-[#121215]"
              />
            ))}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-150 ${
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
          className="absolute z-40 left-0 right-0 mt-1 max-h-[300px] overflow-y-auto rounded-xl bg-[#121215] border border-neutral-700/90 shadow-2xl p-1.5 space-y-0.5"
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
                  className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? "bg-amber-500/15 text-white"
                      : isHighlighted
                        ? "bg-neutral-800/80 text-neutral-100"
                        : "text-neutral-200 hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{cat.name}</div>
                      <div className="text-xs text-neutral-400 truncate">
                        {spec.plotName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center -space-x-1" aria-hidden="true">
                      {spec.palette.map((hex, i) => (
                        <span
                          key={i}
                          style={{ backgroundColor: hex }}
                          className="w-3 h-3 rounded-full border border-[#121215]"
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

      {/* Quiet architectural confirmation strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 px-3.5 py-2.5 rounded-lg bg-[#0e0e11] border border-neutral-800/80 text-xs leading-relaxed">
        <span className="text-neutral-300">
          <strong className="font-medium text-neutral-100">{selectedSpec.plotName}:</strong>{" "}
          {selectedSpec.architecturalStyle}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-neutral-400 tabular-nums">
          {selectedSpec.footprintLabel}
        </span>
      </div>
    </div>
  );
}

