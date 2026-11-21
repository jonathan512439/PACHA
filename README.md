# PACHA · Emergencia Altiplano

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
