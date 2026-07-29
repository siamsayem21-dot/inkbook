import Link from "next/link";

const LINKS = ["Product", "Pricing", "Privacy", "Terms"];

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0A0A0A" }}>
      <div
        className="mx-auto"
        style={{ maxWidth: "1120px", padding: "48px 40px" }}
      >
        {/* Row 1 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "16px",
                color: "#525252",
                display: "block",
              }}
            >
              InkBook
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "#484848",
                letterSpacing: "0.05em",
                display: "block",
                marginTop: "3px",
              }}
            >
              Tattoo Business Operating System
            </span>
          </div>
          <nav className="flex items-center gap-6">
            {LINKS.map((item) => (
              <Link
                key={item}
                href="#"
                className="hover:text-[#A0A0A0] transition-colors duration-150"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "#525252",
                  textDecoration: "none",
                }}
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>

        {/* Row 2 */}
        <div className="text-center mt-6">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "#3D3D3D",
            }}
          >
            © 2025 InkBook. All rights reserved.
          </span>
        </div>

        {/* Row 3 */}
        <div className="text-center mt-2">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "11px",
              color: "#3D3D3D",
            }}
          >
            Copyright © 2026 InkBook
          </span>
        </div>
      </div>
    </footer>
  );
}
