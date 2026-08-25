"use client";

import { useRef, useCallback } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  /** Soft radial glow color behind the cursor. Defaults to a subtle violet. */
  glowColor?: string;
  /**
   * Max tilt in degrees. Corrected 2026-08-25: the original default (2) was
   * confirmed too subtle to notice in production — raised to 3.5, inside the
   * approved 2-4deg range but toward the visible end of it.
   */
  maxTiltDeg?: number;
}

/**
 * Premium dashboard card: soft 3D tilt + cursor-follow light + hover lift +
 * parallax layers. Pointer-fine devices only (desktop) — inert on touch and
 * under prefers-reduced-motion, where it behaves as a plain static card.
 * Use sparingly per the design mission (KPI cards, featured summaries), not
 * on every surface — tables/forms/legal content should stay calm.
 *
 * Parallax: mark any descendant with `data-parallax` (optionally
 * `data-parallax-strength="8"` in px, default 6) and it will drift opposite
 * the card's own tilt — an icon or accent badge "floating" at a shallower
 * depth than the card surface itself. Cached once per mount (not re-queried
 * every pointer frame) to keep this cheap; all writes are direct DOM style/
 * CSS-variable mutations, never React state, so a mousemove never triggers
 * a re-render.
 */
export default function MotionCard({ children, className = "", glowColor, maxTiltDeg = 3.5 }: MotionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabledRef = useRef<boolean | null>(null);
  const parallaxElsRef = useRef<HTMLElement[] | null>(null);

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
    ref.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;

    if (parallaxElsRef.current === null) {
      parallaxElsRef.current = Array.from(ref.current.querySelectorAll<HTMLElement>("[data-parallax]"));
    }
    const cx = px - 0.5;
    const cy = py - 0.5;
    for (const el of parallaxElsRef.current) {
      const strength = Number(el.dataset.parallaxStrength ?? 6);
      el.style.setProperty("--px", `${cx * strength}px`);
      el.style.setProperty("--py", `${cy * strength}px`);
    }
  }, [maxTiltDeg]);

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "";
    for (const el of parallaxElsRef.current ?? []) {
      el.style.setProperty("--px", "0px");
      el.style.setProperty("--py", "0px");
    }
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
