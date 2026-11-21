import type { Metadata } from "next";
import QRCode from "qrcode";
import { urlApp } from "@/lib/url";

export const metadata: Metadata = { title: "Suscribirse" };

const BOT = process.env.TELEGRAM_BOT_USERNAME || "pacha_oruro_bot";

async function Qr({ url, titulo, texto }: { url: string; titulo: string; texto: string }) {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 220, color: { dark: "#14532d", light: "#ffffff" } });
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 text-center space-y-2">
      <h2 className="font-semibold">{titulo}</h2>
      {/* SVG generado por la librería qrcode a partir de una URL nuestra: no hay contenido de usuarios */}
      <div className="mx-auto w-[220px]" dangerouslySetInnerHTML={{ __html: svg }} />
      <a href={url} className="block text-sm text-emerald-800 underline break-all">{url}</a>
      <p className="text-sm text-stone-600">{texto}</p>
    </div>
  );
}

export default async function Suscribirse() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Recibir los avisos</h1>
      <p className="text-stone-600">
        Escanea el código con el celular. El bot te pregunta tu comunidad y desde ahí te llegan los avisos del Senamhi con qué hacer.
        Para dejar de recibirlos, escribe <b>BAJA</b>.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Qr url={`https://t.me/${BOT}`} titulo="Telegram" texto="Abre el chat y toca Iniciar." />
        <Qr url={`${urlApp()}/probar`} titulo="Probar en la web" texto="Sin instalar nada: el mismo bot en el navegador." />
      </div>
      <p className="text-xs text-stone-500">
        WhatsApp: en el piloto se usa un número de prueba que solo admite al equipo; por eso el QR público es de Telegram.
      </p>
    </main>
  );
}
