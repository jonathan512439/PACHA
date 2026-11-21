import type { Metadata } from "next";
import Chat from "@/components/probar/Chat";

export const metadata: Metadata = { title: "Probar el bot" };

export default function Probar() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-3">
      <h1 className="text-2xl font-bold">Probar el bot</h1>
      <p className="text-stone-600 text-sm">
        Simulador web de PACHA. Pregunta qué hacer ante una helada o sequía, o reporta un problema con un audio:
        el bot te pide confirmar y tu reporte entra al mapa de prioridades. Los consejos salen solo de tarjetas con fuente.
      </p>
      <Chat />
    </main>
  );
}
