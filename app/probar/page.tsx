import type { Metadata } from "next";
import Chat from "@/components/probar/Chat";

export const metadata: Metadata = { title: "Probar el bot" };

export default function Probar() {
  return (
    <main className="mx-auto max-w-2xl space-y-3 px-4 py-6 sm:py-8">
      <h1 className="text-4xl font-semibold">Probar el bot</h1>
      <p className="text-tinta-2">
        Es el mismo bot de WhatsApp y Telegram. Puedes preguntar qué hacer ante una helada o una sequía, o enviar un reporte escrito o por
        audio.
      </p>
      <Chat />
    </main>
  );
}
