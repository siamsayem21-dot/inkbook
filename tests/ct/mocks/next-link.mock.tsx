import type { AnchorHTMLAttributes, ReactNode } from "react";

// Minimal stand-in for next/link in the Vite-bundled component-test environment —
// renders a plain anchor since Next.js client-side routing isn't present here.
export default function Link({
  href,
  children,
  ...rest
}: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
