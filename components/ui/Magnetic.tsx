"use client";

import { useRef, useCallback } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Max pixel offset toward the pointer. Kept small on purpose — a nudge, not a chase. */
  strength?: number;
}

/**
 * Same magnetic-pointer-pull effect as MagneticButton, but as a generic
 * wrapper `<div>` — for wrapping a Next.js `<Link>` CTA (e.g. "Start AI
 * Consultation") rather than a real `<button>`. Wrap ONE important CTA per
 * screen, not every link. Pointer-fine + non-reduced-motion only.
 */
export default function Magnetic({ children, strength = 10, className = "" }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  function motionEnabled() {
    return (
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  const handleMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!ref.current || !motionEnabled()) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `translate(${px * strength}px, ${py * strength}px)`;
  }, [strength]);

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "";
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`inline-block motion-spring ${className}`}
    >
      {children}
    </div>
  );
}
