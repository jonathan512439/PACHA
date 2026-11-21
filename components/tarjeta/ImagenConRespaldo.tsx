"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * <img> que, si no carga, prueba `respaldo` y si tampoco carga muestra `alFallar`.
 * Comprueba también al montar: una imagen que falló ANTES de hidratar no dispara onError.
 */
export function ImagenConRespaldo({
  src,
  respaldo,
  alt,
  className,
  alFallar,
}: {
  src: string | null;
  respaldo?: string | null;
  alt: string;
  className?: string;
  alFallar: ReactNode;
}) {
  const [actual, setActual] = useState<string | null>(src ?? respaldo ?? null);
  const ref = useRef<HTMLImageElement>(null);

  const fallar = () => setActual((a) => (respaldo && a !== respaldo ? respaldo : null));

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fallar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual]);

  if (!actual) return <>{alFallar}</>;
  // Imágenes ya optimizadas en Storage: <img> simple, sin el optimizador de Next.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={actual} alt={alt} className={className} onError={fallar} decoding="async" />;
}
