import type { Metadata } from "next";
import "./globals.css";
import EmploymentNovedadesAviso from "@/components/EmploymentNovedadesAviso";
import AuthenticatedEmploymentNav from "@/components/AuthenticatedEmploymentNav";
import BrandTextCleanup from "@/components/BrandTextCleanup";

export const metadata: Metadata = {
  metadataBase: new URL("https://tucoach-oposiciones.com"),
  alternates: { canonical: "/" },
  title: "Tu Coach | Oposiciones y empleo público en la Comunitat Valenciana",
  description:
    "Tests, simulacros y oportunidades de empleo público para oposiciones de la Generalitat Valenciana y administraciones locales de la Comunitat Valenciana.",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tucoach-oposiciones.com/#organization",
      name: "Tu Coach",
      url: "https://tucoach-oposiciones.com/",
    },
    {
      "@type": "WebSite",
      "@id": "https://tucoach-oposiciones.com/#website",
      url: "https://tucoach-oposiciones.com/",
      name: "Tu Coach",
      alternateName: "tucoach-oposiciones.com",
      publisher: { "@id": "https://tucoach-oposiciones.com/#organization" },
      inLanguage: "es",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <style>{`
          .brand-name { font-size: 0 !important; }
          .brand-name::after { content: "Tu Coach"; font-size: 1.18rem; }
          .brand-mark { font-size: 0 !important; display: grid !important; place-items: center !important; }
          .brand-mark::after { content: "TC"; display: block; font-size: .72rem; line-height: 1; font-weight: 900; letter-spacing: -.02em; }
          .brand-byline { display: none !important; }

          .employment-app { width: 100%; }
          .employment-app > .employment-chrome { width: min(1240px, calc(100% - 40px)); margin: 18px auto 0; display: flex; align-items: center; gap: 6px; padding: 6px; border: 1px solid #d9e2ef; border-radius: 14px; background: #fff; box-shadow: 0 6px 20px rgba(31,55,94,.045); }
          .employment-chrome a { display: inline-flex; align-items: center; min-height: 38px; padding: 8px 13px; border-radius: 9px; color: #53627a; text-decoration: none; font-size: 14px; font-weight: 700; }
          .employment-chrome a:hover { background: #f3f7fc; color: #1557c0; }
          .employment-chrome-home { margin-right: 4px; color: #1557c0 !important; font-weight: 850 !important; }
          .employment-chrome-current { background: #eaf2ff; color: #1557c0 !important; }

          .employment-app > main { width: min(1240px, calc(100% - 40px)) !important; max-width: 1240px !important; margin: 0 auto !important; padding: 24px 0 56px !important; font-family: inherit !important; color: #172033 !important; }
          .employment-app > main > header { margin: 0 0 22px !important; padding: 22px 26px !important; border: 1px solid #d9e2ef !important; border-radius: 18px !important; background: #fff !important; box-shadow: 0 8px 24px rgba(31,55,94,.06) !important; align-items: center !important; }
          .employment-app > main > header .kicker { font-size: 0 !important; opacity: 1 !important; margin-bottom: 5px !important; }
          .employment-app > main > header .kicker::after { content: "TU COACH · EMPLEO PÚBLICO"; font-size: 11px; letter-spacing: 1.5px; font-weight: 800; color: #1557c0; }
          .employment-app > main > header h1 { margin: 0 !important; font-size: 34px !important; line-height: 1.12 !important; letter-spacing: -.025em !important; }
          .employment-app > main > header p { margin: 7px 0 0 !important; color: #5c6b80 !important; font-size: 15px !important; }
          .employment-app .headerActions { gap: 9px !important; }
          .employment-app .headerActions .link { color: #1557c0 !important; font-weight: 750 !important; font-size: 0 !important; }
          .employment-app .headerActions .link::after { content: "Tu Coach"; font-size: 14px; }
          .employment-app .headerActions .secondary, .employment-app .primary { border: 1px solid #1557c0 !important; border-radius: 9px !important; background: #1557c0 !important; color: #fff !important; font-weight: 800 !important; text-decoration: none !important; }
          .employment-app .headerActions .secondary { padding: 9px 14px !important; }
          .employment-app > main > .grid { grid-template-columns: 250px minmax(0, 1fr) !important; gap: 18px !important; }
          .employment-app .panel { border: 1px solid #d9e2ef !important; border-radius: 18px !important; padding: 20px !important; background: #fff !important; box-shadow: 0 6px 20px rgba(31,55,94,.035) !important; }
          .employment-app .h2 { font-size: 20px !important; letter-spacing: -.015em !important; }
          .employment-app .item, .employment-app .activeItem { margin-top: 2px !important; padding: 10px !important; border-radius: 9px !important; font-family: inherit !important; font-size: 14px !important; }
          .employment-app .item { color: #34435a !important; }
          .employment-app .item:hover { background: #f3f7fc !important; }
          .employment-app .activeItem { background: #eaf2ff !important; color: #1557c0 !important; font-weight: 800 !important; }
          .employment-app .card { border: 1px solid #d9e2ef !important; border-radius: 14px !important; background: #fff !important; box-shadow: 0 5px 16px rgba(31,55,94,.03) !important; }
          .employment-app .cardButton { padding: 18px !important; }
          .employment-app .cardTop, .employment-app .muted, .employment-app .meta { color: #64738a !important; }
          .employment-app .cardOrg { color: #53627a !important; opacity: 1 !important; }
          .employment-app .badge { border: 1px solid #bcd1ee !important; background: #f4f8ff !important; color: #1557c0 !important; }
          .employment-app .cardTitle { color: #172033 !important; }
          .employment-app .cardSummary { color: #34435a !important; }
          .employment-app .follow, .employment-app .primary { border-radius: 9px !important; font-family: inherit !important; font-weight: 800 !important; }
          .employment-app .follow { border: 1px solid #bcd1ee !important; background: #eef5ff !important; color: #1557c0 !important; padding: 9px 13px !important; }
          .employment-app .cardLayout > .primary { margin-right: 18px !important; padding: 9px 13px !important; }
          .employment-app .sectionHead { margin-bottom: 2px !important; }
          .employment-app .error { border: 1px solid #e5bcbc !important; border-radius: 10px !important; background: #fff7f7 !important; color: #8a2424 !important; }

          .employment-app > main > header > a[href="/"] { font-size: 0 !important; color: #1557c0 !important; font-weight: 800 !important; }
          .employment-app > main > header > a[href="/"]::after { content: "← Tu Coach"; font-size: 14px; }
          .employment-app a[href="/"] { color: #1557c0; }

          .auth-back { font-size: 0 !important; }
          .auth-back::after { content: "← Volver a Tu Coach"; font-size: 14px; }

          @media (max-width: 700px) {
            .employment-app > .employment-chrome, .employment-app > main { width: min(100% - 20px, 1240px) !important; }
            .employment-chrome { overflow-x: auto; }
            .employment-app > main > header { padding: 20px !important; }
            .employment-app > main > .grid { grid-template-columns: 1fr !important; }
            .employment-app .headerActions { flex-wrap: wrap; }
          }
        `}</style>

        <BrandTextCleanup />

        <EmploymentNovedadesAviso />
        {children}
        <AuthenticatedEmploymentNav />
      </body>
    </html>
  );
}
