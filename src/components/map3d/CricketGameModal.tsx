"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Trophy, Flame, RotateCcw } from "lucide-react";
import { bazaarAudio } from "@/lib/audio/bazaarAudio";

interface CricketGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
}

export function CricketGameModal({ isOpen, onClose, cityName }: CricketGameModalProps) {
  const [meterPos, setMeterPos] = useState(0); // 0 to 100
  const [isSwinging, setIsSwinging] = useState(false);
  const [result, setResult] = useState<{ runs: number; text: string; sub: string } | null>(null);
  const [score, setScore] = useState(18);
  const animRef = useRef<number | null>(null);
  const dirRef = useRef<number>(1);
  const posRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen || result !== null) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let last = performance.now();
    const loop = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      posRef.current += dirRef.current * 140 * delta;
      if (posRef.current >= 100) {
        posRef.current = 100;
        dirRef.current = -1;
      } else if (posRef.current <= 0) {
        posRef.current = 0;
        dirRef.current = 1;
      }

      setMeterPos(posRef.current);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen, result]);

  if (!isOpen) return null;

  const handleSwing = () => {
    if (result !== null) return;
    setIsSwinging(true);
    bazaarAudio.playCricketHit();

    // Sweet spot is between 44 and 56
    const distanceToCenter = Math.abs(meterPos - 50);

    let hitResult: { runs: number; text: string; sub: string };

    if (distanceToCenter <= 6) {
      const lowerCity = cityName.toLowerCase();
      const landmarkTarget = lowerCity.includes("mumbai")
        ? "into the Arabian Sea over Marine Drive"
        : lowerCity.includes("bangalore") || lowerCity.includes("bengaluru")
        ? "over Chinnaswamy into Cubbon Park"
        : lowerCity.includes("delhi")
        ? "over the Red Sandstone heritage walls"
        : "right across the high street into the river";

      hitResult = {
        runs: 6,
        text: "Six Runs · 118 Meters",
        sub: `Clean strike ${landmarkTarget}.`,
      };
      setScore((s) => s + 6);
      bazaarAudio.playConfettiPop();
      import("canvas-confetti").then((m) => {
        m.default({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      });
    } else if (distanceToCenter <= 18) {
      hitResult = {
        runs: 4,
        text: "Four Runs",
        sub: "Driven crisply past the covers to the boundary rope.",
      };
      setScore((s) => s + 4);
    } else if (distanceToCenter <= 34) {
      hitResult = {
        runs: 2,
        text: "Two Runs",
        sub: "Turned into the deep mid-wicket gap with quick running.",
      };
      setScore((s) => s + 2);
    } else {
      hitResult = {
        runs: 0,
        text: "Dot Ball",
        sub: "Beaten by movement outside off stump. Time your next stroke.",
      };
    }

    setResult(hitResult);
    setIsSwinging(false);
  };

  const handlePlayAgain = () => {
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-neutral-950 border border-neutral-800 p-6 flex flex-col items-center shadow-2xl text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close cricket game"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cricket Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
          <Trophy className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-300 mb-1">
          <span>{cityName} Community Cricket</span>
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight mb-1">
          Riverbank Match Pitch
        </h3>
        <p className="text-xs text-neutral-400 mb-4 max-w-xs">
          Time your stroke in the sweet spot to clear the boundary rope.
        </p>

        {/* Total Scoreboard */}
        <div className="w-full py-2 px-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs mb-4">
          <span className="text-neutral-400">Total Runs Scored:</span>
          <span className="font-bold text-amber-400 font-mono text-sm">{score}</span>
        </div>

        {/* Timing Meter */}
        <div className="w-full flex flex-col gap-1.5 mb-5">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Early</span>
            <span className="text-emerald-400 font-medium">Sweet Spot</span>
            <span>Late</span>
          </div>

          <div className="relative w-full h-7 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden">
            {/* Zones */}
            <div className="absolute inset-y-0 left-[35%] right-[35%] bg-emerald-500/20 border-x border-emerald-500/40" />
            <div className="absolute inset-y-0 left-[44%] right-[44%] bg-amber-400/30 border-x border-amber-400/60" />

            {/* Sliding Cursor */}
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] -ml-1 transition-all"
              style={{ left: `${meterPos}%` }}
            />
          </div>
        </div>

        {/* Outcome result banner */}
        {result ? (
          <div className="w-full p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col items-center gap-1 mb-4 animate-scale-in">
            <span className="text-sm font-bold text-white">
              {result.text}
            </span>
            <span className="text-xs text-neutral-400 leading-snug">
              {result.sub}
            </span>
            <button
              type="button"
              onClick={handlePlayAgain}
              className="mt-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bowl Next Ball</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSwing}
            disabled={isSwinging}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/30 mb-2 cursor-pointer"
          >
            <span>Hit Ball</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-neutral-400 hover:text-white transition-colors py-1"
        >
          Return to Bazaar Street
        </button>
      </div>
    </div>
  );
}

