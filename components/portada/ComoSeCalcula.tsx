import { PESOS, TOPES } from "@/contratos/prioridad";

/** Explicación pública de la fórmula de prioridad (los números salen del contrato, no se repiten a mano). */
export function ComoSeCalcula() {
  const criterios = [
    { nombre: "Días sin agua o forraje", puntos: PESOS.sinRecurso, tope: `${TOPES.dias} días` },
    { nombre: "Familias afectadas", puntos: PESOS.familias, tope: `${TOPES.familias} familias` },
    { nombre: "Animales afectados", puntos: PESOS.animales, tope: `${TOPES.animales} animales` },
    { nombre: "Tiempo de espera desde la confirmación", puntos: PESOS.espera, tope: `${TOPES.esperaDias} días` },
  ];
  return (
    <details id="como-se-calcula" className="group scroll-mt-4 rounded-xl border border-borde bg-superficie shadow-suave">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-titulo text-lg font-semibold [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-marca transition-transform group-open:rotate-90">▸</span>
        ¿Cómo se calcula la prioridad?
      </summary>
      <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-tinta">
        <p>Se suman cuatro criterios, hasta 100 puntos. Cada uno cuenta de 0 al máximo, hasta su tope:</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-left">
            <thead>
              <tr className="border-b border-borde-fuerte text-tinta-2">
                <th scope="col" className="py-1.5 pr-3 font-semibold">Criterio</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Hasta</th>
                <th scope="col" className="py-1.5 font-semibold">Tope</th>
              </tr>
            </thead>
            <tbody className="cifras">
              {criterios.map((c) => (
                <tr key={c.nombre} className="border-b border-borde">
                  <td className="py-1.5 pr-3">{c.nombre}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold">{c.puntos} puntos</td>
                  <td className="py-1.5">{c.tope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Si un dato falta, vale la mitad: no baja la prioridad de quien no supo decirlo. Si el reporte no trae familias o animales, se usa el dato de la comunidad.</p>
        <p>
          La prioridad de una comunidad es la de su reporte confirmado más alto que aún no fue atendido. La preparación de la comunidad{" "}
          <b>nunca</b> entra en la fórmula.
        </p>
        <p className="text-tinta-2">Los pesos son una propuesta del equipo para el piloto y se ajustan con el municipio.</p>
      </div>
    </details>
  );
}
