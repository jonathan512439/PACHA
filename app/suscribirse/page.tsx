import type { Metadata } from "next";
import QRCode from "qrcode";
import { BellRing, ClipboardList, Mic, Truck } from "lucide-react";
import { urlApp } from "@/lib/url";
import { COLORES } from "@/components/ui/tokens";

export const metadata: Metadata = { title: "Suscribirse", description: "Recibe los avisos del Senamhi con qué hacer, en Telegram o en la web." };

const BOT = process.env.TELEGRAM_BOT_USERNAME || "pacha_oruro_bot";

async function Qr({ url, titulo, texto }: { url: string; titulo: string; texto: string }) {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 280, color: { dark: COLORES.tinta, light: "#ffffff" } });
  return (
    <div className="space-y-3 rounded-xl border border-borde bg-superficie p-5 text-center shadow-suave">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      {/* SVG generado por la librería qrcode a partir de una URL nuestra: no hay contenido de usuarios */}
      <div className="mx-auto w-full max-w-[280px]" dangerouslySetInnerHTML={{ __html: svg }} />
      <a href={url} className="flex min-h-10 items-center justify-center break-all text-sm font-semibold text-marca underline">{url}</a>
      <p className="text-sm text-tinta-2">{texto}</p>
    </div>
  );
}

const PASOS = [
  { n: 1, texto: "Escanea el código con la cámara del celular." },
  { n: 2, texto: "Toca Iniciar y elige tu comunidad." },
  { n: 3, texto: "Listo: te llegan los avisos. Para dejar de recibirlos, escribe BAJA." },
];

const RECIBES = [
  { Icono: BellRing, texto: "El aviso oficial del Senamhi cuando hay helada, nevada o sequía en tu zona, aprobado por una persona." },
  { Icono: ClipboardList, texto: "Qué hacer: una tarjeta corta con audio, sacada de guías oficiales." },
  { Icono: Mic, texto: "Puedes reportar por audio si te falta agua o forraje. Tu reporte entra al mapa público." },
  { Icono: Truck, texto: "Cuando llega una entrega, te preguntamos si llegó." },
];

export default async function Suscribirse() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-8">
      <header className="max-w-prose space-y-2">
        <h1 className="text-4xl font-semibold">Recibir los avisos</h1>
        <p className="text-lg text-tinta-2">Es gratis. El bot te pregunta tu comunidad y puedes darte de baja cuando quieras.</p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-3">
        {PASOS.map((p) => (
          <li key={p.n} className="flex gap-3 rounded-xl border border-borde bg-superficie p-4">
            <span className="cifras font-titulo text-3xl font-semibold leading-none text-acento" aria-hidden="true">{p.n}</span>
            <span className="text-tinta"><span className="sr-only">Paso {p.n}: </span>{p.texto}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 sm:grid-cols-2">
        <Qr url={`https://t.me/${BOT}`} titulo="Telegram" texto="Abre el chat y toca Iniciar." />
        <Qr url={`${urlApp()}/probar`} titulo="Probar en la web" texto="Sin instalar nada: el mismo bot en el navegador." />
      </div>

      <section aria-labelledby="que-recibes" className="space-y-3">
        <h2 id="que-recibes" className="text-2xl font-semibold">Qué recibes</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {RECIBES.map(({ Icono, texto }) => (
            <li key={texto} className="flex gap-3 rounded-xl border border-borde bg-superficie p-4 text-tinta">
              <Icono aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marca" />
              {texto}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-tinta-2">
        WhatsApp: en el piloto se usa un número de prueba que solo admite al equipo. Por eso el código público es de Telegram. Los audios usan voz
        sintética.
      </p>
    </main>
  );
}
