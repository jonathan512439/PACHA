# PACHA

Avisos del Senamhi y reportes de las comunidades del Altiplano de Oruro, en un solo sistema.

- **Sitio:** https://pacha-lilac.vercel.app
- **Bot de Telegram:** [@pacha_oruro_bot](https://t.me/pacha_oruro_bot) · también en la web: https://pacha-lilac.vercel.app/probar

Proyecto de hackathon (21–22 nov 2026). Las comunidades, los reportes y las entregas que se ven en el sitio son **de demostración**; el boletín del Senamhi es real.

## Qué hace
1. **Aviso del Senamhi.** El sistema revisa el boletín agrometeorológico del Senamhi para el Altiplano. Si hay riesgo, prepara una alerta con qué hacer. **Una persona del municipio la revisa** antes de enviarla por WhatsApp o Telegram. Para un comunicado urgente, la técnica lo carga en el panel en tres pasos.
2. **Recomendaciones.** Cada alerta llega con pasos concretos, en texto y audio, tomados de documentos de FAO, Senamhi y otras instituciones. Cada paso cita su documento y página.
3. **Reportes por voz.** Las familias envían un audio contando qué falta (agua, forraje), desde cuándo y cuántas familias son. El bot confirma lo que entendió antes de registrarlo.
4. **Prioridad y entregas.** Los reportes confirmados ordenan a las comunidades en un mapa público, con una fórmula que se muestra en el sitio. El municipio registra cada entrega y la comunidad confirma si la recibió.

## Principios
- **No pronosticamos:** solo retransmitimos avisos oficiales, con su enlace original.
- **La IA no escribe consejos ni alertas.** Gemini lee el boletín y entiende los audios; devuelve datos validados y solo puede elegir recomendaciones de una lista cerrada. **Toda alerta la aprueba una persona.**
- **Transparencia:** el mapa, la prioridad, las recomendaciones, las fuentes y las entregas son públicos y no piden cuenta. Solo el panel del municipio pide usuario y contraseña.
- **Privacidad:** el sitio no muestra nombres, teléfonos ni los audios de las personas.

## Páginas
| Público | Panel (con usuario) |
|---|---|
| `/` mapa, aviso vigente y resumen · `/como-funciona` · `/tarjetas` qué hacer · `/fuentes` boletines y documentos usados · `/entregas` · `/resumen` versión para imprimir · `/comunidad/[id]` ficha · `/suscribirse` · `/probar` | `/panel` resumen y problemas activos · `/panel/alertas` boletín, comunicado de última hora, aprobar y enviar · `/panel/reportes` revisar reportes y registrar entregas · `/panel/tarjetas` y `/panel/fuentes` editor de tarjetas y fuentes |

## Arquitectura y tecnologías
**Monolito modular**: un solo proyecto Next.js desplegado en Vercel, organizado por dominios (`lib/bot`, `lib/canales`, `lib/alertas` + `lib/boletin`, `lib/tarjetas`, `contratos/prioridad`, `lib/visibilidad`, `lib/sesion`). Los tipos, las validaciones y el esquema de la base se definen primero en [`contratos/`](contratos/).

| Pieza | Tecnología |
|---|---|
| Web, API, webhooks y panel | Next.js 16 (App Router, TypeScript), Tailwind CSS 4 |
| Base de datos y archivos | Supabase (Postgres con RLS, Storage) |
| Lectura de boletines, audios y voz | Gemini (`@google/genai`) |
| Validación y contratos | Zod 4 |
| Canales | Telegram Bot API, WhatsApp (Cloud API de Meta o sandbox de Vonage), chat web |
| Mapa | Leaflet + OpenStreetMap |
| Revisión periódica | Vercel Cron (diario) + GitHub Actions (cada 30 min) |
| Pruebas | Vitest |

El detalle completo (patrones, flujos, por qué cada tecnología y límites) está en [`docs/guion-defensa-tecnica.md`](docs/guion-defensa-tecnica.md).

## Correr en local
Requisitos: Node.js 22, un proyecto de Supabase y una clave de Gemini.

```
npm ci
cp .env.example .env      # completar los valores (nunca subirlos al repo)
npm run dev
```

**Base de datos:** en el SQL Editor de Supabase, ejecutar `contratos/schema.sql` y `contratos/storage.sql`; después, las migraciones de `contratos/migraciones/` en orden de fecha. Guía: [`docs/setup-supabase.md`](docs/setup-supabase.md).

**Datos iniciales:**
```
npm run seed:lecciones    # tarjetas (data/tarjetas/tarjetas.json)
npm run seed:demo         # comunidades, reportes y entregas de demostración
npm run panel:usuario -- <usuario> <tecnico|admin>   # línea para PANEL_USERS
```

**Comprobaciones:**
```
npm run typecheck && npm run lint && npm test && npx next build
```

Otros scripts: `generar:audios`, `subir:audios`, `subir:imagenes`, `exportar:tarjetas`, `verificar:tarjeta` (ver [`docs/instructivo-salida-tarjetas.md`](docs/instructivo-salida-tarjetas.md)).

## Variables de entorno
La lista está en [`.env.example`](.env.example), sin valores. Las obligatorias son `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `PANEL_USERS` y `CRON_SECRET`, más las del canal que se use (Telegram o WhatsApp). `CRON_SECRET` tiene que tener el mismo valor en Vercel y en los secretos de GitHub Actions.

## Documentación
| Documento | Para qué |
|---|---|
| [`docs/guion-defensa-tecnica.md`](docs/guion-defensa-tecnica.md) | Arquitectura, patrones, tecnologías y preguntas frecuentes |
| [`docs/instructivo-alertas.md`](docs/instructivo-alertas.md) | Cómo entran y se envían las alertas, simulacro y demo |
| [`docs/mvp.md`](docs/mvp.md) | Alcance del producto |
| [`contratos/CONTRATOS.md`](contratos/CONTRATOS.md) | Tablas, tipos y reglas |
| [`decisiones.md`](decisiones.md) | Registro de decisiones y cambios de contrato |
| [`docs/instructivo-whatsapp.md`](docs/instructivo-whatsapp.md) | Configuración de WhatsApp (Meta) |
| [`docs/instructivo-vonage.md`](docs/instructivo-vonage.md) | WhatsApp por el sandbox de Vonage (demo) |

## Fuentes y créditos
- **Avisos:** Senamhi, Boletín Agrometeorológico Decenal, Macro Región Altiplano.
- **Recomendaciones:** FAO, Senamhi–INSA, CIPCA, CDC y otras instituciones; la lista completa con enlaces está en `/fuentes`.
- **Mapa:** © colaboradores de OpenStreetMap, con Leaflet.
- **Ilustraciones:** generadas con IA.
