import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PACHA",
  description:
    "Alertas oficiales, prioridades comunitarias y entregas transparentes para el Altiplano de Oruro.",
};

const navigation = [
  { label: "Mapa", href: "/" },
  { label: "Tarjetas", href: "/tarjetas" },
  { label: "Entregas", href: "/entregas" },
  { label: "Probar el bot", href: "/probar" },
  { label: "Suscribirse", href: "/suscribirse" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="site-shell">
          <header className="site-header">
            <Link className="brand" href="/" aria-label="PACHA, ir al mapa">
              <span className="brand-mark" aria-hidden="true">P</span>
              <span>PACHA</span>
            </Link>
            <nav aria-label="Navegación principal" className="main-nav">
              {navigation.map((item) => (
                <Link
                  className={item.label === "Suscribirse" ? "nav-cta" : ""}
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            <span>Comunidades y entregas de EJEMPLO · Avisos: Senamhi · Voz sintética</span>
            <span>PACHA · Altiplano de Oruro</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
