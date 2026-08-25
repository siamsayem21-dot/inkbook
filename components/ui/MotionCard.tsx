"use client";

import { useRef, useCallback } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  /** Soft radial glow color behind the cursor. Defaults to a subtle violet. */
  glowColor?: string;
  /** Max tilt in degrees. Keep small — this is a "premium SaaS" wobble, not a game card. */
  maxTiltDeg?: number;
}

/**
 * Premium dashboard card: soft 3D tilt + cursor-follow light + hover lift.
 * Pointer-fine devices only (desktop) — inert on touch and under
 * prefers-reduced-motion, where it behaves as a plain static card.
 * Use sparingly per the design mission (KPI cards, featured summaries), not
 * on every surface — tables/forms/legal content should stay calm.
 */
export default function MotionCard({ children, className = "", glowColor, maxTiltDeg = 2 }: MotionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabledRef = useRef<boolean | null>(null);

  function motionEnabled() {
    if (enabledRef.current !== null) return enabledRef.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    enabledRef.current = fine && !reduced;
    return enabledRef.current;
  }

  const handleMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!motionEnabled() || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    ref.current.style.setProperty("--mx", `${px * 100}%`);
    ref.current.style.setProperty("--my", `${py * 100}%`);

    const rotateY = (px - 0.5) * maxTiltDeg * 2;
    const rotateX = (0.5 - py) * maxTiltDeg * 2;
    ref.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
  }, [maxTiltDeg]);

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "";
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`cursor-glow motion-spring tap-scale ${className}`}
      style={glowColor ? ({ "--glow-color": glowColor } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
