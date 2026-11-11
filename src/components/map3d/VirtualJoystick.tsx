"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

interface VirtualJoystickProps {
  onMove: (vector: { forward: number; strafe: number }) => void;
  className?: string;
}

export function VirtualJoystick({ onMove, className = "" }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = 45; // max drag radius in pixels

  const handleTouchMove = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }

      setKnobPos({ x: dx, y: dy });

      // Normalized vector
      const forward = -dy / radius;
      const strafe = dx / radius;

      onMove({ forward, strafe });
    },
    [onMove, radius]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsActive(true);
    handleTouchMove(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        handleTouchMove(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove({ forward: 0, strafe: 0 });
        break;
      }
    }
  };

  // Mouse fallback for desktop testing
  const onMouseDown = (e: React.MouseEvent) => {
    setIsActive(true);
    handleTouchMove(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      handleTouchMove(ev.clientX, ev.clientY);
    };

    const onMouseUp = () => {
      setIsActive(false);
      setKnobPos({ x: 0, y: 0 });
      onMove({ forward: 0, strafe: 0 });
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    return () => {
      onMove({ forward: 0, strafe: 0 });
    };
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
      className={`relative w-28 h-28 rounded-full bg-neutral-950/75 backdrop-blur-xl border-2 transition-colors select-none touch-none flex items-center justify-center cursor-pointer shadow-2xl ${
        isActive ? "border-amber-500 shadow-amber-500/20" : "border-neutral-700/60 shadow-black/60"
      } ${className}`}
      aria-label="Virtual Walking Joystick"
      role="slider"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={knobPos.y}
    >
      {/* Direction Guide Indicators */}
      <span className="absolute top-1 text-[9px] font-mono text-neutral-500 font-bold pointer-events-none">▲</span>
      <span className="absolute bottom-1 text-[9px] font-mono text-neutral-500 font-bold pointer-events-none">▼</span>
      <span className="absolute left-1.5 text-[9px] font-mono text-neutral-500 font-bold pointer-events-none">◀</span>
      <span className="absolute right-1.5 text-[9px] font-mono text-neutral-500 font-bold pointer-events-none">▶</span>

      {/* Center crosshair */}
      <div className="absolute w-2 h-2 rounded-full bg-neutral-700/50 pointer-events-none" />

      {/* Thumb Knob */}
      <div
        className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 shadow-lg flex items-center justify-center transition-transform pointer-events-none"
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: isActive ? "none" : "transform 0.15s ease-out",
        }}
      >
        <div className="w-4 h-4 rounded-full bg-white/40" />
      </div>
    </div>
  );
}

