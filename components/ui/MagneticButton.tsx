"use client";

import { useRef, useCallback } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent, ButtonHTMLAttributes } from "react";

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Max pixel offset toward the pointer. Kept small on purpose — a nudge, not a chase. */
  strength?: number;
}

/**
 * Wrap a single important CTA in this to get a small magnetic pull toward the
 * pointer on desktop. Pointer-fine + non-reduced-motion only; touch/reduced
 * motion render a plain button. Use on ONE or two CTAs per screen, not every
 * button — see the design mission's "Magnetic CTA" section.
 */
export default function MagneticButton({ children, strength = 8, className = "", ...rest }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function motionEnabled() {
    return (
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  const handleMove = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
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
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`motion-spring ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
