import { Mountain, Snowflake, Sun } from "lucide-react";
import { etiquetaEstadoTarjeta, type Tarjeta } from "@/contratos/tipos";
import { esBorrador, resumirFuentes, type ImagenesTarjeta } from "@/lib/tarjeta-publica";
import { IconoTema } from "./IconoTema";
import { ImagenConRespaldo } from "./ImagenConRespaldo";
import s from "./tarjeta.module.css";

const AMENAZA = { helada: "Helada", sequia: "Sequía", nevada: "Nevada" } as const;
const FASE = { antes_familia: "Antes", antes_animales: "Antes · animales", durante: "Durante", despues: "Después" } as const;

/**
 * Tarjeta "qué hacer": ÚNICA fuente de verdad visual (web, A4 y PNG 1080×1350).
 * Orden: encabezado 16:9 → título → 3 pasos (número + texto + imagen o ícono) → pie con fuentes → estado.
 * Quien la usa ya aplicó la regla de publicación; aquí, si es borrador, la etiqueta se dibuja siempre.
 */
export function TarjetaVisual({
  tarjeta: t,
  imagenes,
  variante,
}: {
  tarjeta: Tarjeta;
  imagenes: ImagenesTarjeta;
  variante: "web" | "imagen";
}) {
  const borrador = esBorrador(t);
  const IconoAmenaza = t.hazard === "sequia" ? Sun : Snowflake;
  const franjaNeutra = (
    <div className={s.encabezadoNeutro} data-encabezado="neutro" aria-hidden="true">
      <Mountain strokeWidth={1.25} />
    </div>
  );

  return (
    <article
      className={`${s.tarjeta} ${variante === "imagen" ? s.imagen : s.web} ${t.hazard === "sequia" ? s.sequia : s.helada}`}
      data-tarjeta={t.id}
      data-estado={t.status}
    >
      <div className={s.encabezado}>
        <ImagenConRespaldo
          src={imagenes.encabezado}
          respaldo={imagenes.encabezadoRespaldo}
          alt=""
          className={s.encabezadoImg}
          alFallar={franjaNeutra}
        />
      </div>

      <div className={s.cuerpo}>
        <header className={s.titulo}>
          <p className={s.insignia}>
            <IconoAmenaza aria-hidden="true" strokeWidth={2} />
            {AMENAZA[t.hazard]} · {FASE[t.phase]}
          </p>
          <h1>{t.title}</h1>
        </header>

        <ol className={s.pasos}>
          {t.steps.map((paso, i) => (
            <li key={i} className={s.paso}>
              <span className={s.numero} aria-hidden="true">{i + 1}</span>
              <p className={s.textoPaso}>{paso}</p>
              <div className={s.imagenPaso}>
                <ImagenConRespaldo
                  src={imagenes.pasos[i].url}
                  alt=""
                  className={s.imagenPasoImg}
                  alFallar={<IconoTema tema={imagenes.pasos[i].icono} className={s.iconoPaso} />}
                />
              </div>
            </li>
          ))}
        </ol>

        <footer className={s.pie}>
          <p className={s.fuentes}>
            <strong>Fuente: </strong>
            {resumirFuentes(t.step_sources).map((linea, i) => (
              <span key={i} className={s.lineaFuente}>{linea}</span>
            ))}
          </p>
          <p className={s.notaIA}>Ilustraciones generadas con IA; siga el texto.</p>
          {!borrador && <p className={s.estado}>✔ {etiquetaEstadoTarjeta(t)}</p>}
        </footer>

        {/* Etiqueta de estado: va al final y nunca se recorta (flex-shrink: 0 en el CSS). */}
        {borrador && (
          <p className={s.borrador} data-etiqueta-borrador>
            {etiquetaEstadoTarjeta(t)}
          </p>
        )}
      </div>
    </article>
  );
}
