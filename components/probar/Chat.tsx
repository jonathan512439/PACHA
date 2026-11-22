"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, SendHorizontal, Square, Volume2 } from "lucide-react";
import { Insignia } from "@/components/ui/Insignia";
import { clasesBoton } from "@/components/ui/Boton";
import type { BotWebRequest, SalidaBot } from "@/contratos/tipos";

/*
 * Simulador del bot: el mismo cerebro que Telegram y WhatsApp (POST /api/bot/web).
 * La identidad es una cookie anónima que pone el servidor; aquí no se manda ningún id.
 * La voz se graba con MediaRecorder (Chrome: audio/webm;codecs=opus, que Gemini acepta tal cual).
 */

type Mensaje = { id: number; de: "persona"; texto: string } | { id: number; de: "bot"; salida: SalidaBot };
const MAX_SEG = 60;
let siguienteId = 1;

export default function Chat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const grabador = useRef<MediaRecorder | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [mensajes, enviando]);

  async function enviar(cuerpo: BotWebRequest, eco: string) {
    setMensajes((m) => [...m, { id: siguienteId++, de: "persona", texto: eco }]);
    setEnviando(true);
    try {
      const r = await fetch("/api/bot/web", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
      const j = (await r.json().catch(() => ({ respuestas: [{ tipo: "texto", texto: "Ocurrió un error. Escribe 0 para ver el menú." }] }))) as { respuestas?: SalidaBot[] };
      setMensajes((m) => [...m, ...(j.respuestas ?? []).map((s) => ({ id: siguienteId++, de: "bot" as const, salida: s }))]);
    } catch {
      setMensajes((m) => [...m, { id: siguienteId++, de: "bot", salida: { tipo: "texto", texto: "Sin conexión, intenta de nuevo." } }]);
    } finally {
      setEnviando(false);
    }
  }

  const tocar = (id: string, titulo: string) => !enviando && enviar({ tipo: "boton", botonId: id }, titulo);

  async function grabar() {
    if (grabando) { grabador.current?.stop(); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { alert("No se pudo usar el micrófono. Revisa el permiso del navegador."); return; }
    const rec = new MediaRecorder(stream);
    const partes: Blob[] = [];
    let seg = 0;
    const reloj = setInterval(() => { seg++; setSegundos(seg); if (seg >= MAX_SEG) rec.stop(); }, 1000);
    rec.ondataavailable = (e) => partes.push(e.data);
    rec.onstop = async () => {
      clearInterval(reloj);
      stream.getTracks().forEach((t) => t.stop());
      setGrabando(false); setSegundos(0);
      const blob = new Blob(partes, { type: rec.mimeType });
      if (blob.size < 1000) return; // grabación vacía
      const base64 = await new Promise<string>((ok) => {
        const lector = new FileReader();
        lector.onload = () => ok(String(lector.result).split(",")[1] ?? "");
        lector.readAsDataURL(blob);
      });
      if (base64.length > 3_500_000) { alert("El audio es muy largo."); return; }
      enviar({ tipo: "audio", audio: { base64, mime: rec.mimeType || "audio/webm" } }, `🎤 Audio (${seg} s)`);
    };
    grabador.current = rec;
    rec.start();
    setGrabando(true);
  }

  const vacio = mensajes.length === 0;
  return (
    <div className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-xl border border-borde bg-superficie shadow-suave">
      <div className="flex-1 space-y-3 overflow-y-auto bg-fondo p-4" aria-live="polite">
        {vacio && (
          <div className="mx-auto mt-8 max-w-sm space-y-4 text-center text-tinta">
            <p>Es el mismo bot que en Telegram y WhatsApp. Puedes escribir, tocar botones o mandar un audio.</p>
            <button onClick={() => enviar({ tipo: "texto", texto: "hola" }, "hola")} className={clasesBoton("primario", "lg")}>
              Empezar
            </button>
            <p className="text-sm text-tinta-2">Al registrarte puedes elegir la <b className="text-tinta">Comunidad de prueba</b>. Lo que reportes aparece en el mapa.</p>
          </div>
        )}
        {mensajes.map((m) => m.de === "persona"
          ? <div key={m.id} className="ml-auto w-fit max-w-[80%] whitespace-pre-line rounded-2xl rounded-br-sm bg-marca px-3.5 py-2 text-white">{m.texto}</div>
          : <Burbuja key={m.id} s={m.salida} tocar={tocar} />)}
        {enviando && <div className="w-fit rounded-2xl border border-borde bg-superficie px-3.5 py-2 text-tinta-2">escribiendo…</div>}
        <div ref={fin} />
      </div>
      <form className="flex gap-2 border-t border-borde bg-superficie p-3"
        onSubmit={(e) => { e.preventDefault(); const t = texto.trim(); if (t && !enviando) { setTexto(""); enviar({ tipo: "texto", texto: t }, t); } }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} placeholder="Escribe un mensaje…" aria-label="Mensaje"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-borde-fuerte bg-superficie px-3 py-2 text-tinta placeholder:text-tinta-2" disabled={grabando} />
        <button type="button" onClick={grabar} disabled={enviando}
          className={grabando ? clasesBoton("peligro", "md", "cifras") : clasesBoton("secundario", "md")}
          aria-label={grabando ? `Detener grabación (${segundos} s)` : "Grabar audio"}>
          {grabando ? <><Square aria-hidden="true" className="size-4" />{segundos} s</> : <Mic aria-hidden="true" className="size-5" />}
        </button>
        <button type="submit" disabled={enviando || grabando || !texto.trim()} className={clasesBoton("primario", "md")} aria-label="Enviar">
          <SendHorizontal aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
}

/** "Ver tarjeta completa" en la misma web, aunque el bot mande la URL absoluta de producción. */
const rutaLocal = (url: string) => { try { return new URL(url).pathname; } catch { return url; } };

function Burbuja({ s, tocar }: { s: SalidaBot; tocar: (id: string, titulo: string) => void }) {
  const caja = "w-fit max-w-[85%] rounded-2xl rounded-bl-sm border border-borde bg-superficie px-3.5 py-2 text-tinta";
  switch (s.tipo) {
    case "texto":
      return <div className={`${caja} whitespace-pre-line`}>{s.texto}</div>;
    case "audio":
      return (
        <div className={caja}>
          <audio controls src={s.mp3Url ?? s.oggUrl} className="max-w-full" />
          <p className="mt-1 flex items-center gap-1 text-xs text-tinta-2"><Volume2 aria-hidden="true" className="size-3.5" />Audio con voz sintética</p>
        </div>
      );
    case "botones":
    case "lista": {
      const opciones = s.tipo === "botones" ? s.botones : s.filas;
      return (
        <div className={caja}>
          <p className="whitespace-pre-line">{s.texto}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {opciones.map((o) => (
              <button key={o.id} onClick={() => tocar(o.id, o.titulo)}
                className="min-h-11 rounded-full border border-marca bg-superficie px-4 text-[15px] font-medium text-marca hover:bg-marca-suave">
                {o.titulo}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "tarjeta": {
      const borrador = s.etiquetaEstado.startsWith("BORRADOR");
      return (
        <article className="w-full max-w-[85%] overflow-hidden rounded-xl border border-borde bg-superficie shadow-suave sm:max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen pública de Supabase Storage */}
          {s.imagenUrl && <img src={s.imagenUrl} alt="" className="aspect-[16/9] w-full object-cover" />}
          <div className="space-y-3 p-4">
            <h3 className="text-lg font-semibold leading-snug">{s.titulo}</h3>
            <ol className="space-y-2">
              {s.pasos.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="cifras font-titulo text-2xl font-semibold leading-none text-acento" aria-hidden="true">{i + 1}</span>
                  <span className="pt-0.5 text-[15px] font-medium">{p}</span>
                </li>
              ))}
            </ol>
            <p className="border-t border-borde pt-2 text-xs text-tinta-2"><b className="text-tinta">Fuente:</b> {s.fuente}</p>
            <Insignia tipo={borrador ? "borrador" : "verificada"}>{s.etiquetaEstado}</Insignia>
            {(s.audioMp3Url ?? s.audioOggUrl) && (
              <div>
                <audio controls src={s.audioMp3Url ?? s.audioOggUrl} className="w-full" />
                <p className="mt-1 flex items-center gap-1 text-xs text-tinta-2"><Volume2 aria-hidden="true" className="size-3.5" />Audio con voz sintética</p>
              </div>
            )}
            {s.urlCompleta && (
              <Link href={rutaLocal(s.urlCompleta)} className="inline-block text-sm font-semibold text-marca underline">Ver tarjeta completa</Link>
            )}
          </div>
        </article>
      );
    }
  }
}
