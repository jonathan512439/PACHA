"use client";

import { BotWebResponse, type BotWebRequest, type SalidaBot } from "@/contratos/tipos";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import s from "./probar.module.css";

type MensajeChat =
  | { id: string; rol: "persona"; texto: string; audio?: boolean }
  | { id: string; rol: "bot"; salida: SalidaBot };

const MAX_BASE64 = 3_500_000;
const MAX_SEGUNDOS_AUDIO = 60;

function nuevoId() {
  return crypto.randomUUID();
}

function horaAudio(segundos: number) {
  const mins = Math.floor(segundos / 60).toString().padStart(2, "0");
  const secs = (segundos % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function SimuladorBot() {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [preparandoMicrofono, setPreparandoMicrofono] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [aviso, setAviso] = useState("");
  const enviandoRef = useRef(false);
  const grabandoRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervaloRef = useRef<number | null>(null);
  const segundosRef = useRef(0);
  const mensajesFinalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mensajesFinalRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, enviando]);

  useEffect(
    () => () => {
      if (intervaloRef.current !== null) window.clearInterval(intervaloRef.current);
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function enviar(entrada: BotWebRequest, textoPersona: string, audioPersona = false) {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setAviso("");
    const mensajePersona: MensajeChat = {
      id: nuevoId(),
      rol: "persona",
      texto: textoPersona,
      audio: audioPersona,
    };
    setMensajes((actuales) => [...actuales, mensajePersona]);

    let response: Response;
    try {
      response = await fetch("/api/bot/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entrada),
      });
    } catch (error) {
      console.error("No se pudo conectar con /api/bot/web:", error);
      setAviso("Sin conexión, intenta de nuevo");
      enviandoRef.current = false;
      setEnviando(false);
      return;
    }

    let contenido: unknown;
    try {
      contenido = await response.json();
    } catch (error) {
      console.error("La respuesta de /api/bot/web no es JSON válido:", error);
      setAviso("No se pudo leer la respuesta del bot. Intenta de nuevo.");
      enviandoRef.current = false;
      setEnviando(false);
      return;
    }

    const resultado = BotWebResponse.safeParse(contenido);
    if (!resultado.success) {
      const errorServidor =
        typeof contenido === "object" &&
        contenido !== null &&
        "error" in contenido &&
        typeof contenido.error === "string"
          ? contenido.error
          : null;
      console.error("Respuesta inválida de /api/bot/web:", resultado.error);
      setAviso(errorServidor ?? "El bot devolvió una respuesta con formato inválido.");
    } else if (!response.ok && response.status !== 500) {
      setAviso("El mensaje no se pudo enviar. Intenta de nuevo.");
    } else {
      const mensajesBot: MensajeChat[] = resultado.data.respuestas.map((salida) => ({
          id: nuevoId(),
          rol: "bot" as const,
          salida,
        }));
      setMensajes((actuales) => [...actuales, ...mensajesBot]);
    }

    enviandoRef.current = false;
    setEnviando(false);
  }

  function enviarTexto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje || enviandoRef.current) return;
    setTexto("");
    void enviar({ tipo: "texto", texto: mensaje }, mensaje);
  }

  function tocarOpcion(id: string, etiqueta: string) {
    void enviar({ tipo: "boton", botonId: id }, etiqueta);
  }

  async function terminarGrabacion(recorder: MediaRecorder, chunks: BlobPart[]) {
    if (intervaloRef.current !== null) {
      window.clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
    const duracion = Math.min(MAX_SEGUNDOS_AUDIO, Math.max(1, segundosRef.current));
    setSegundos(duracion);
    setGrabando(false);
    grabandoRef.current = false;
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const audio = new Blob(chunks, { type: recorder.mimeType });
    if (!audio.size) {
      setAviso("No se grabó audio. Intenta de nuevo.");
      return;
    }
    if (!recorder.mimeType) {
      setAviso("El navegador no indicó el formato del audio. Intenta con Chrome.");
      return;
    }
    if (4 * Math.ceil(audio.size / 3) > MAX_BASE64) {
      setAviso("El audio supera el límite de 3,5 MB. Graba un mensaje más corto.");
      return;
    }

    try {
      const bytes = new Uint8Array(await audio.arrayBuffer());
      let binario = "";
      for (let inicioBytes = 0; inicioBytes < bytes.length; inicioBytes += 0x8000) {
        const bloque = bytes.subarray(inicioBytes, inicioBytes + 0x8000);
        binario += String.fromCharCode(...bloque);
      }
      const base64 = btoa(binario);
      if (base64.length > MAX_BASE64) {
        setAviso("El audio supera el límite de 3,5 MB. Graba un mensaje más corto.");
        return;
      }
      void enviar(
        { tipo: "audio", audio: { base64, mime: recorder.mimeType } },
        `Nota de voz · ${horaAudio(duracion)}`,
        true,
      );
    } catch (error) {
      console.error("No se pudo preparar el audio para enviarlo:", error);
      setAviso("No se pudo preparar el audio. Intenta grabarlo de nuevo.");
    }
  }

  async function iniciarGrabacion() {
    if (grabandoRef.current || enviandoRef.current) return;
    setAviso("");
    setSegundos(0);
    segundosRef.current = 0;
    setPreparandoMicrofono(true);
    grabandoRef.current = true;

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Este navegador no permite grabar audio.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        void terminarGrabacion(recorder, chunks);
      };
      recorder.onerror = (event) => {
        console.error("Error al grabar audio:", event);
        setAviso("Falló la grabación. Revisa el micrófono e intenta de nuevo.");
        if (recorder.state !== "inactive") recorder.stop();
      };

      recorder.start();
      setGrabando(true);
      setPreparandoMicrofono(false);
      intervaloRef.current = window.setInterval(() => {
        segundosRef.current = Math.min(segundosRef.current + 1, MAX_SEGUNDOS_AUDIO);
        setSegundos(segundosRef.current);
        if (segundosRef.current >= MAX_SEGUNDOS_AUDIO && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 1000);
    } catch (error) {
      console.error("No se pudo iniciar la grabación:", error);
      grabandoRef.current = false;
      setGrabando(false);
      setPreparandoMicrofono(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setAviso(
        error instanceof Error
          ? `${error.message} Revisa los permisos del micrófono e intenta de nuevo.`
          : "No se pudo acceder al micrófono. Revisa los permisos e intenta de nuevo.",
      );
    }
  }

  function detenerGrabacion() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function renderSalida(salida: SalidaBot) {
    switch (salida.tipo) {
      case "texto":
        return <p className={s.botText}>{salida.texto}</p>;
      case "audio":
        return (
          <div className={s.audioReply}>
            <span>Mensaje de voz</span>
            <audio controls preload="none" src={salida.mp3Url ?? salida.oggUrl}>
              Tu navegador no puede reproducir este audio.
            </audio>
          </div>
        );
      case "botones":
        return (
          <div className={s.interactiveReply}>
            <p className={s.botText}>{salida.texto}</p>
            <div className={s.options}>
              {salida.botones.map((boton) => (
                <button
                  disabled={enviando}
                  key={boton.id}
                  onClick={() => tocarOpcion(boton.id, boton.titulo)}
                  type="button"
                >
                  {boton.titulo}
                </button>
              ))}
            </div>
          </div>
        );
      case "lista":
        return (
          <div className={s.interactiveReply}>
            <p className={s.botText}>{salida.texto}</p>
            <span className={s.listTitle}>{salida.boton}</span>
            <div className={s.options}>
              {salida.filas.map((fila) => (
                <button
                  disabled={enviando}
                  key={fila.id}
                  onClick={() => tocarOpcion(fila.id, fila.titulo)}
                  type="button"
                >
                  <span>{fila.titulo}</span>
                  {fila.descripcion && <small>{fila.descripcion}</small>}
                </button>
              ))}
            </div>
          </div>
        );
      case "tarjeta":
        return (
          <article className={s.cardReply}>
            <div className={s.cardHeading}>
              <span>RECOMENDACIÓN PACHA</span>
              <span className={s.cardStatus}>{salida.etiquetaEstado}</span>
            </div>
            <h3>{salida.titulo}</h3>
            <ol>
              {salida.pasos.map((paso, index) => (
                <li key={`${salida.id}-${index}`}>{paso}</li>
              ))}
            </ol>
            <p className={s.cardSource}>
              Fuente: {salida.fuente}, pág. {salida.pagina}
            </p>
            {salida.fuenteUrl && (
              <a className={s.sourceLink} href={salida.fuenteUrl} rel="noreferrer" target="_blank">
                Abrir fuente <span aria-hidden="true">↗</span>
              </a>
            )}
            {salida.audioMp3Url && (
              <audio controls preload="none" src={salida.audioMp3Url}>
                Tu navegador no puede reproducir este audio.
              </audio>
            )}
            {salida.imagenUrl && (
              <Image
                alt={`Imagen de la tarjeta ${salida.titulo}`}
                className={s.cardImage}
                height={300}
                loading="lazy"
                src={salida.imagenUrl}
                unoptimized
                width={280}
              />
            )}
          </article>
        );
    }
  }

  return (
    <section aria-label="Chat de prueba del bot" className={s.chat}>
      <div className={s.chatTop}>
        <div className={s.botIdentity}>
          <span aria-hidden="true" className={s.botAvatar}>
            P
          </span>
          <div>
            <strong>Asistente PACHA</strong>
            <span>
              <i aria-hidden="true" /> Simulador web
            </span>
          </div>
        </div>
        <span className={s.chatLabel}>DEMO</span>
      </div>

      <div aria-live="polite" className={s.messages} role="log">
        {mensajes.length === 0 ? (
          <div className={s.startPanel}>
            <span aria-hidden="true" className={s.startIcon}>
              ✳
            </span>
            <h2>Hola, soy PACHA.</h2>
            <p>
              Puedo compartir avisos y recomendaciones, o recibir un reporte
              sobre tu comunidad.
            </p>
            <button
              className={s.startButton}
              disabled={enviando}
              onClick={() => void enviar({ tipo: "texto", texto: "hola" }, "hola")}
              type="button"
            >
              Empezar <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          mensajes.map((mensaje) =>
            mensaje.rol === "persona" ? (
              <div className={`${s.messageRow} ${s.personRow}`} key={mensaje.id}>
                <div className={`${s.bubble} ${s.personBubble}`}>
                  {mensaje.audio && <span aria-hidden="true">♫ </span>}
                  {mensaje.texto}
                </div>
              </div>
            ) : (
              <div className={`${s.messageRow} ${s.botRow}`} key={mensaje.id}>
                <span aria-hidden="true" className={s.smallAvatar}>
                  P
                </span>
                <div className={s.bubble}>{renderSalida(mensaje.salida)}</div>
              </div>
            ),
          )
        )}
        {enviando && (
          <div className={`${s.messageRow} ${s.botRow}`}>
            <span aria-hidden="true" className={s.smallAvatar}>
              P
            </span>
            <div aria-label="El bot está respondiendo" className={`${s.bubble} ${s.typing}`}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {aviso && <p className={s.errorNotice} role="alert">{aviso}</p>}
        <div ref={mensajesFinalRef} />
      </div>

      <div className={s.composer}>
        <div className={`${s.voiceRow} ${grabando ? s.voiceActive : ""}`}>
          <button
            aria-label={grabando ? "Detener y enviar audio" : "Grabar mensaje de voz"}
            className={s.recordButton}
            disabled={enviando || preparandoMicrofono}
            onClick={grabando ? detenerGrabacion : () => void iniciarGrabacion()}
            type="button"
          >
            <span aria-hidden="true">{grabando ? "■" : "●"}</span>
            {preparandoMicrofono
              ? "Abriendo micrófono…"
              : grabando
                ? "Detener y enviar"
                : "Grabar voz"}
          </button>
          <span aria-live="polite" className={s.timer}>
            {horaAudio(segundos)} / 01:00
          </span>
          <span className={s.voiceHint}>Máximo 60 s</span>
        </div>
        <form className={s.textForm} onSubmit={enviarTexto}>
          <label className={s.srOnly} htmlFor="mensaje-bot">
            Escribe un mensaje
          </label>
          <input
            autoComplete="off"
            disabled={enviando || grabando || preparandoMicrofono}
            id="mensaje-bot"
            maxLength={1000}
            onChange={(event) => setTexto(event.target.value)}
            placeholder="Escribe un mensaje…"
            value={texto}
          />
          <button
            aria-label="Enviar mensaje"
            className={s.sendButton}
            disabled={!texto.trim() || enviando || grabando || preparandoMicrofono}
            type="submit"
          >
            <span aria-hidden="true">↑</span>
          </button>
        </form>
        <p className={s.composerFootnote}>El menú también funciona sin escribir una pregunta.</p>
      </div>
    </section>
  );
}
