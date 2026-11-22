import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Cabecera } from "@/components/ui/Cabecera";
import { Pie } from "@/components/ui/Pie";
import { COLORES } from "@/components/ui/tokens";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "PACHA · Altiplano de Oruro", template: "%s · PACHA" },
  description:
    "Avisos del Senamhi, reportes de las comunidades y registro de entregas de agua y forraje en el Altiplano de Oruro.",
};

// Un solo tema claro: "only light" evita además el oscurecido forzado de Chrome en Android.
export const viewport: Viewport = { colorScheme: "only light", themeColor: COLORES.marca };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-fondo font-sans text-tinta">
        <Cabecera />
        <div id="contenido" className="flex-1">{children}</div>
        <Pie />
      </body>
    </html>
  );
}
