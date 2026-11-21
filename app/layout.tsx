import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PACHA · Avisos y respuesta en el Altiplano", template: "%s · PACHA" },
  description: "Avisos oficiales del Senamhi con qué hacer, reportes por voz, prioridad pública y entregas verificables para comunidades del Altiplano de Oruro.",
};

const NAV = [
  { href: "/", texto: "Mapa" },
  { href: "/tarjetas", texto: "Tarjetas" },
  { href: "/entregas", texto: "Entregas" },
  { href: "/probar", texto: "Probar el bot" },
  { href: "/suscribirse", texto: "Suscribirse" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 [font-family:var(--font-geist-sans),system-ui,sans-serif]">
        <header className="bg-emerald-900 text-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="text-xl font-bold tracking-wide">PACHA</Link>
            <nav aria-label="Principal" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:underline underline-offset-4">{n.texto}</Link>)}
            </nav>
            <Link href="/panel" className="ml-auto text-xs opacity-80 hover:opacity-100 hover:underline">Panel técnico</Link>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-stone-200 bg-white text-xs text-stone-600">
          <div className="mx-auto max-w-5xl px-4 py-4 space-y-1">
            <p>
              <strong>Comunidades, reportes y entregas de EJEMPLO.</strong> Avisos: Senamhi (boletín agrometeorológico decenal).
              Los audios usan voz sintética. Las tarjetas citan su fuente y página.
            </p>
            <p>Piloto pensado para un municipio del Altiplano de Oruro · Hackathon 2026 · Mapa © colaboradores de OpenStreetMap.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
