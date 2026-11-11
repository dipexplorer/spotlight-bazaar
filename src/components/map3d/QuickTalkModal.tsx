"use client";

import React from "react";
import { MessageSquare, X, Sparkles, Heart } from "lucide-react";

interface QuickTalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase: (phrase: string) => void;
}

const TALK_CATEGORIES = [
  {
    category: "Greetings",
    phrases: [
      "Namaste! 🙏",
      "Hello! 👋",
      "Hi everyone!",
      "Welcome to Guwahati! 🌿",
      "Ram Ram! 🌸",
      "Khurumjari! ☀️",
    ],
  },
  {
    category: "Bazaar & Shopping",
    phrases: [
      "Love this shop! ✨",
      "Great portfolio! 📸",
      "What are your rates? 💰",
      "Bookmarked for my wedding! 💍",
      "Chai break time! ☕",
      "Support local artisans! 🇮🇳",
    ],
  },
  {
    category: "Community & Interaction",
    phrases: [
      "Come see my storefront!",
      "Follow me down the lane!",
      "Let's play cricket! 🏏",
      "Nice to meet you!",
      "So creative!",
      "See you around! 👋",
    ],
  },
];

const QUICK_EMOJIS = ["👋", "🙏", "🔥", "❤️", "👏", "☕", "🏏", "✨", "🎉", "🦏", "⭐", "🇮🇳"];

export function QuickTalkModal({
  isOpen,
  onClose,
  onSelectPhrase,
}: QuickTalkModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">Quick Talk</h3>
              <p className="text-xs text-slate-400">Say something to nearby shoppers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phrases List */}
        <div className="mt-4 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {TALK_CATEGORIES.map((cat) => (
            <div key={cat.category}>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-400/90 mb-2 block">
                {cat.category}
              </span>
              <div className="flex flex-wrap gap-2">
                {cat.phrases.map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => {
                      onSelectPhrase(phrase);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 border border-slate-700/60 hover:border-amber-400 text-xs font-medium text-slate-200 transition-all hover:scale-105 active:scale-95"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Emojis */}
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-2 block">
              Emoji Reactions
            </span>
            <div className="grid grid-cols-6 gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelectPhrase(emoji);
                    onClose();
                  }}
                  className="h-10 rounded-2xl bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Microcopy */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Everyone here right now sees it float over your head for a few seconds. Ready-made greetings only.
          </p>
        </div>
      </div>
    </div>
  );
}
