import { connection } from "next/server";
import { Suspense } from "react";
import { listarReportesPanel } from "@/lib/panel/reportes";
import { ReportesPanel } from "./reportes-panel";

export default function ReportesPage() {
  return (
    <Suspense fallback={<main>Cargando reportes…</main>}>
      <ContenidoReportes />
    </Suspense>
  );
}

async function ContenidoReportes() {
  await connection();
  const reportes = await listarReportesPanel();
  return <ReportesPanel iniciales={reportes} />;
}
