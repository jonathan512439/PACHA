# PACHA

Bot y panel para alertas de helada, sequía y nevada en el Altiplano de Oruro (hackathon, 21–22 nov 2026).

- Qué se construye: [`docs/mvp.md`](docs/mvp.md)
- Plan hora por hora: [`docs/plan.md`](docs/plan.md)
- Contratos (tablas, tipos y rutas): [`contratos/CONTRATOS.md`](contratos/CONTRATOS.md)
- Decisiones: [`decisiones.md`](decisiones.md)

## Correr en local
```
npm install
cp .env.example .env.local   # completar con las claves (se pasan por privado)
npm run dev
```

Stack: Next.js (App Router, TS) en Vercel · Supabase · Gemini (`@google/genai`) · Zod v4.

## Demo y panel

- Configura `PANEL_USERS` en `.env.local` y en Vercel con el formato
  `usuario1:clave1,usuario2:clave2`. Las rutas `/panel` y las APIs de escritura
  usan autenticación Basic.
- `npm run seed:demo` carga comunidades y entregas de EJEMPLO. Antes, coloca
  las tres fotos entregadas por el equipo de contenido en
  `public/demo/entregas/` como `entrega-01`, `entrega-02` y `entrega-03`,
  con extensión `.jpg`, `.jpeg`, `.png` o `.webp`. Deben mostrar objetos sin
  personas ni metadatos EXIF.
- `/panel` incluye **Reiniciar demo**; conserva las suscripciones existentes.
- `/panel/alertas` muestra el fixture de ejemplo. Búsqueda, carga de PDF,
  aprobación y envío permanecen desactivados hasta que estén disponibles las
  APIs de boletines y alertas.
