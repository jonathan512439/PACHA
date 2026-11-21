import { Droplets, Fence, Sprout, Wheat, type LucideIcon } from "lucide-react";
import type { TemaIcono } from "@/lib/tarjeta-publica";

// Íconos neutros de respaldo cuando falta (o falla) la imagen de un paso.
const ICONOS: Record<TemaIcono, { Icono: LucideIcon; nombre: string }> = {
  gotas:   { Icono: Droplets, nombre: "Agua" },
  heno:    { Icono: Wheat,    nombre: "Forraje" },
  corral:  { Icono: Fence,    nombre: "Corral" },
  semilla: { Icono: Sprout,   nombre: "Cultivo" },
};

export function IconoTema({ tema, className }: { tema: TemaIcono; className?: string }) {
  const { Icono, nombre } = ICONOS[tema];
  return (
    <span className={className} data-icono={tema} role="img" aria-label={`Ícono: ${nombre}`}>
      <Icono strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}
