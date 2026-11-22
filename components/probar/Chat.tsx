"use client";
import { useEffect, useRef, useState } from "react";
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
    <div className="flex flex-col rounded-xl border border-stone-300 bg-white h-[70vh] min-h-[480px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
        {vacio && (
          <div className="text-center text-stone-600 mt-10 space-y-3">
            <p>Es el mismo bot que en Telegram y WhatsApp. Puedes escribir, tocar botones o mandar un audio.</p>
            <button onClick={() => enviar({ tipo: "texto", texto: "hola" }, "hola")} className="rounded-lg bg-emerald-800 px-5 py-2 text-white font-semibold">
              Empezar
            </button>
            <p className="text-xs">Al registrarte puedes elegir la <b>Comunidad de prueba</b>. Lo que reportes aparece en el mapa.</p>
          </div>
        )}
        {mensajes.map((m) => m.de === "persona"
          ? <div key={m.id} className="ml-auto max-w-[80%] w-fit rounded-2xl rounded-br-sm bg-emerald-700 px-3 py-2 text-white">{m.texto}</div>
          : <Burbuja key={m.id} s={m.salida} tocar={tocar} />)}
        {enviando && <div className="w-fit rounded-2xl bg-stone-100 px-3 py-2 text-stone-500">escribiendo…</div>}
        <div ref={fin} />
      </div>
      <form className="flex gap-2 border-t border-stone-200 p-3"
        onSubmit={(e) => { e.preventDefault(); const t = texto.trim(); if (t && !enviando) { setTexto(""); enviar({ tipo: "texto", texto: t }, t); } }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} placeholder="Escribe un mensaje…" aria-label="Mensaje"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2" disabled={grabando} />
        <button type="button" onClick={grabar} disabled={enviando}
          className={`rounded-lg px-3 py-2 font-semibold ${grabando ? "bg-red-600 text-white" : "bg-stone-200"}`}
          aria-label={grabando ? "Detener grabación" : "Grabar audio"}>
          {grabando ? `⏹ ${segundos}s` : "🎤"}
        </button>
        <button type="submit" disabled={enviando || grabando || !texto.trim()} className="rounded-lg bg-emerald-800 px-4 py-2 text-white font-semibold disabled:opacity-50">
          Enviar
        </button>
      </form>
    </div>
  );
}

function Burbuja({ s, tocar }: { s: SalidaBot; tocar: (id: string, titulo: string) => void }) {
  const caja = "max-w-[85%] w-fit rounded-2xl rounded-bl-sm bg-stone-100 px-3 py-2";
  switch (s.tipo) {
    case "texto":
      return <div className={`${caja} whitespace-pre-line`}>{s.texto}</div>;
    case "audio":
      return <div className={caja}><audio controls src={s.mp3Url ?? s.oggUrl} className="max-w-full" /><p className="text-xs text-stone-500">Voz sintética</p></div>;
    case "botones":
    case "lista": {
      const opciones = s.tipo === "botones" ? s.botones : s.filas;
      return (
        <div className={caja}>
          <p className="whitespace-pre-line">{s.texto}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {opciones.map((o) => (
              <button key={o.id} onClick={() => tocar(o.id, o.titulo)} className="rounded-full border border-emerald-700 bg-white px-3 py-1 text-sm text-emerald-800 hover:bg-emerald-50">
                {o.titulo}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "tarjeta":
      return (
        <article className="max-w-[85%] rounded-xl border border-stone-300 bg-white overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen pública de Supabase Storage */}
          {s.imagenUrl && <img src={s.imagenUrl} alt="" className="w-full max-h-60 object-cover" />}
          <div className="p-3 space-y-2">
            <h3 className="font-bold">{s.titulo}</h3>
            <ol className="list-decimal ml-5 space-y-1">{s.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
            <p className="text-xs text-stone-600">Fuente: {s.fuente}</p>
            <p className={`text-xs font-semibold ${s.etiquetaEstado.startsWith("BORRADOR") ? "text-red-700" : "text-emerald-800"}`}>{s.etiquetaEstado}</p>
            {(s.audioMp3Url ?? s.audioOggUrl) && <><audio controls src={s.audioMp3Url ?? s.audioOggUrl} className="w-full" /><p className="text-xs text-stone-500">🔊 Audio con voz sintética</p></>}
          </div>
        </article>
      );
  }
}
