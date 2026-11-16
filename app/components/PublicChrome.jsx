import { Link } from "react-router";
import publicStylesUrl from "../styles/public.css?url";

export const PUBLIC_LINKS = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;700&display=swap",
  },
  { rel: "stylesheet", href: publicStylesUrl },
];

export function BrandQrIcon() {
  return (
    <svg
      className="brand-mark__icon"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3z" />
      <path d="M17 20h4v-3" />
      <path d="M21 14v.01" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav-row">
        <Link to="/" className="brand-mark" aria-label="QR Studio home">
          <BrandQrIcon />
          <span>QR Studio</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <a className="nav-link" href="#destinations">
            Destinations
          </a>
          <a className="nav-link" href="#stickers">
            Stickers
          </a>
          <a className="nav-link" href="#faq">
            Questions
          </a>
          <Link to="/auth/login" className="btn btn--secondary btn--compact">
            Store login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SubpageHeader() {
  return (
    <header className="site-header">
      <div className="container nav-row">
        <Link to="/" className="brand-mark" aria-label="QR Studio home">
          <BrandQrIcon />
          <span>QR Studio</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link to="/auth/login" className="btn btn--secondary btn--compact">
            Store login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-row">
          <div>
            <Link to="/" className="brand-mark" aria-label="QR Studio home">
              <BrandQrIcon />
              <span>QR Studio</span>
            </Link>
            <p className="footer-note">
              Shopify embedded QR generator.
            </p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <a className="nav-link" href="/#destinations">
              Destinations
            </a>
            <a className="nav-link" href="/#stickers">
              Stickers
            </a>
            <a className="nav-link" href="/#faq">
              Questions
            </a>
            <Link className="nav-link" to="/auth/login">
              Store login
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
