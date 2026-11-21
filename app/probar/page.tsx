import { SimuladorBot } from "./simulador";
import s from "./probar.module.css";

export default function ProbarPage() {
  return (
    <main className={s.page}>
      <header className={s.heading}>
        <span className={s.eyebrow}>PACHA · SIMULADOR</span>
        <h1>Prueba el bot</h1>
        <p>
          Regístrate, consulta una recomendación o manda un reporte por voz.
          Este chat usa el mismo flujo que los canales del bot.
        </p>
      </header>
      <SimuladorBot />
      <p className={s.privacy}>
        Tu sesión se mantiene con una cookie segura; no enviamos un identificador
        de usuario desde este chat.
      </p>
    </main>
  );
}
