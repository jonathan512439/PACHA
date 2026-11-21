"use client";

import { useState } from "react";
import s from "./panel.module.css";

export function BotonReiniciar() {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function reiniciar() {
    if (!window.confirm("Se borrarán los reportes y alertas, y se conservarán las personas suscritas. ¿Continuar?")) return;
    setCargando(true);
    setMensaje("");
    try {
      const respuesta = await fetch("/api/demo/reiniciar", { method: "POST" });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        const detalle =
          typeof cuerpo === "object" &&
          cuerpo !== null &&
          "error" in cuerpo &&
          typeof cuerpo.error === "string"
            ? cuerpo.error
            : "No se pudo reiniciar la demo.";
        throw new Error(detalle);
      }
      setMensaje("Demo reiniciada. Las personas suscritas se conservaron.");
      window.location.reload();
    } catch (error) {
      console.error("No se pudo reiniciar la demo:", error);
      setMensaje(error instanceof Error ? error.message : "No se pudo reiniciar la demo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={s.resetArea}>
      <button className={s.resetButton} disabled={cargando} onClick={() => void reiniciar()} type="button">
        {cargando ? "Reiniciando…" : "Reiniciar demo"}
      </button>
      {mensaje && <span className={s.resetMessage} role="status">{mensaje}</span>}
    </div>
  );
}
