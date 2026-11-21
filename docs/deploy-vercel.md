# Deploy en Vercel: estado y plan de integración

Revisado el sáb 21 nov a las 15:30. Referencias: `docs/plan.md` (horarios), `contratos/CONTRATOS.md` (rutas) y `docs/setup-supabase.md`.

> **Regla de oro:** las claves solo se cargan en Vercel (Settings › Environment Variables) o en `.env.local`. Nunca en el repo, en `.env.example` ni en el chat del grupo.

---

## 1. Estado actual (verificado)

| Qué | Estado |
|---|---|
| Equipo de Vercel | `PACHA` (`pacha11`) |
| Proyecto | `pacha` · framework Next.js · Node 26.x |
| Repo conectado | `jonathan512439/PACHA`, rama de producción `main` |
| Producción | ✅ READY con `dcdc9ef` (Gemini y contratos v0.2.1), redeploy hecho **después** de cargar las variables |
| Región de las funciones | ✅ São Paulo (`gru1`), la misma región que Supabase |
| URL de producción | **https://pacha-lilac.vercel.app** → responde 200 (pública) |
| Otras URLs (`pacha-pacha11…`, `pacha-git-main-…`, previews y las de cada deploy) | 302 → piden iniciar sesión en Vercel |
| Protección | Vercel Authentication en modo *Standard*: protege los previews y las URLs de cada deploy. El dominio de producción queda público |
| Variables en Production y Preview | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_MODEL` |
| Variables solo en Production | `GEMINI_API_KEY`, `DEMO_FIXTURES`, `TELEGRAM_WEBHOOK_SECRET` y `SUPABASE_ANON_KEY` (esta última no la usa el código) |

---

## 2. Pendientes

Ya hecho: `.env.example` sin valores, región `gru1`, rama `feat/gemini-bot` unida a `main`, variables básicas cargadas y redeploy de producción.

1. **Preview sin `GEMINI_API_KEY` ni `DEMO_FIXTURES`.** En los previews, Gemini falla. Cargar en Preview una **clave personal** (nunca la del demo) y `DEMO_FIXTURES=auto`.
2. **Comprobar el valor de `SUPABASE_URL` en Vercel.** Tiene que ser solo `https://<proyecto>.supabase.co`, **sin** `/rest/v1/`. Con `/rest/v1/`, `supabase-js` falla.
3. **Elegir el dominio final** antes del sáb 17:00, porque el webhook de Telegram, los QR y el afiche lo usan. Por ejemplo `pacha-altiplano.vercel.app`, en Settings › Domains › Edit. Después de esa hora **no se cambia**.
4. **Cada vez que se cambie una variable, hacer Redeploy** (Deployments › ⋯ › Redeploy). Si no, el deploy publicado sigue con los valores anteriores.

---

## 3. Variables de entorno

Se cargan en **Settings › Environment Variables**. Marcar como **Sensitive** las que dicen "Sí".
**Cambiar una variable no afecta al deploy que ya está publicado: hay que hacer Redeploy.**

| Variable | Production | Preview / Development | Sensible | Quién la da | Para cuándo |
|---|---|---|---|---|---|
| `SUPABASE_URL` | URL del proyecto, sin `/rest/v1` | igual | No | A | **Ya** |
| `SUPABASE_SERVICE_ROLE_KEY` | clave secreta | igual | **Sí** | A, por privado | **Ya** |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | igual | No | — | **Ya** |
| `GEMINI_API_KEY` | personal hasta el dom 12:15; después, **la del demo** | **personal** (nunca la del demo) | **Sí** | Cada uno / A | **Ya** |
| `DEMO_FIXTURES` | `auto` | `auto` | No | — | **Ya** |
| `PANEL_USERS` | `patricia:<clave>,marco:<clave>` | igual | **Sí** | Equipo | Sáb 14:30 |
| `PROBAR_TOPE_DIARIO` | límite diario − 100 (ver `decisiones.md`) | `50` | No | A | Sáb 15:30 |
| `TELEGRAM_BOT_TOKEN` | token de @BotFather | igual o un bot de prueba | **Sí** | C, por privado | Sáb 17:00 |
| `TELEGRAM_WEBHOOK_SECRET` | texto aleatorio (`openssl rand -hex 32`) | — | **Sí** | A | Sáb 17:00 |
| `TECNICA_CONTACTO` | `telegram:<chat_id>` | igual | No | Equipo | Dom 9:00 |
| `CRON_SECRET` | texto aleatorio (16 o más caracteres) | — | **Sí** | A | Dom 9:00 |
| `WHATSAPP_TOKEN` | token de Meta (**regenerar a T-30 min**) | — | **Sí** | C | Dom 11:00 |
| `WHATSAPP_PHONE_NUMBER_ID` | id del número de prueba | — | No | C | Dom 11:00 |
| `WHATSAPP_VERIFY_TOKEN` | texto aleatorio | — | **Sí** | A | Dom 11:00 |
| `WHATSAPP_APP_SECRET` | App Secret de Meta | — | **Sí** | C | Dom 11:00 |
| `GROQ_API_KEY` | solo si se usa el plan B de audio | — | **Sí** | A | Si hace falta |

No se cargan: `SUPABASE_ANON_KEY` (el código no la usa) ni ninguna variable `NEXT_PUBLIC_…` con claves.

---

## 4. Ramas y deploys

- **`main` = producción** (`pacha-lilac.vercel.app` o el dominio final). Solo entra lo que ya pasó por un preview sin errores.
- **Cada rama** (`feat/…`, `diseno/…`) genera un **preview** automático. Para abrirlo hay que iniciar sesión en Vercel con una cuenta del equipo `pacha11`. Quien no tenga cuenta en el equipo no lo ve: hay que invitarlo en Team › Members.
- **Los webhooks (Telegram y WhatsApp) y el jurado usan siempre el dominio de producción**, porque los previews están protegidos y responderían 302 o 401.
- **Antes de unir a `main`:** `npm run build` sin errores en local, y el preview abierto y revisado.
- **Si producción se rompe:** Deployments › el último deploy bueno › **Instant Rollback**. Tarda segundos y no hay que tocar git.

---

## 5. Hitos de integración (alineados con `plan.md`)

| Cuándo | Qué se despliega | Comprobación en producción |
|---|---|---|
| ✅ Sáb 15:10 | Variables "Ya", región `gru1`, `feat/gemini-bot` unida a `main` | Hecho: producción READY en `gru1` |
| Sáb 15:30 | Seed, Reiniciar demo y `proxy.ts` con `PANEL_USERS` | `/panel` sin contraseña → **401**. Con contraseña → entra |
| **Sáb 16:30** | `/probar` conectado a `/api/bot/web` | Registro → menú → pregunta → reporte confirmado, **con Gemini real** (control 16:30) |
| Sáb 17:00 | Dominio final fijado. Adaptador de Telegram | `setWebhook` a `https://<dominio>/api/webhooks/telegram` con `secret_token`. `getWebhookInfo` sin errores |
| Sáb 18:00 | Mapa `/` | Un reporte cambia el color en el mapa (control 18:00). **Primer video** |
| Dom 9:00 | `vercel.json` con el cron de `/api/boletin/buscar`, y `CRON_SECRET` | Settings › Cron Jobs muestra el cron. Llamarlo a mano con `Authorization: Bearer <CRON_SECRET>` → 200; sin el header → 401 |
| Dom 10:00–11:00 | Panel de alertas, reportes, prioridad y `/entregas` | Lista del §3 de `plan.md` (C) |
| Dom 11:00 | Webhook de WhatsApp | En Meta: Callback URL `https://<dominio>/api/webhooks/whatsapp` y el verify token. La verificación GET pasa |
| **Dom 12:15** | `GEMINI_API_KEY` del demo **solo en Production** → **Redeploy** | Un mensaje en `/probar` responde. En el preview sigue la clave personal |
| Dom 12:30 | **Congelado.** Solo arreglos con rollback a mano | — |
| T-30 min | Regenerar `WHATSAPP_TOKEN` → Redeploy | Un mensaje de prueba llega |
| Dom 15:00–15:40 | `DEMO_FIXTURES=on` → Redeploy (ensayos 2 y 3) | Al terminar, **volver a `auto` y hacer Redeploy** |

---

## 6. Para el diseño (Next.js 16)

- **`cacheComponents: true` está activado** en `next.config.ts`. Por eso:
  - Toda página que lea de Supabase, de cookies o de `headers()` tiene que poner esa parte dentro de `<Suspense fallback={…}>`. Si no, el build falla con *"Uncached data was accessed outside of <Suspense>"*.
  - Lo que puede cachearse (por ejemplo `/tarjetas`) puede usar `"use cache"` con `cacheLife(...)`.
  - Antes de escribir código, leer la guía en `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- **`middleware.ts` ahora se llama `proxy.ts`** (basic auth del panel).
- **Mapa:** Leaflet con `dynamic(() => import(...), { ssr: false })`, dentro de un componente cliente, con la atribución de OSM.
- **Imágenes de tarjetas:** `paquete_tarjetas/assets/lessons/*` (1,9 MB) van al bucket `tarjetas` de Supabase (columna `image_path`) o a `public/tarjetas/`. Se elige una sola opción.
- **Ojo:** `paquete_tarjetas/contratos/` tiene un `tipos.ts` y un `schema.sql` **distintos** de los de `contratos/`. La fuente de verdad es **`contratos/`**. No se copian esos archivos encima.
- **Límites de Vercel para las rutas:**
  - El cuerpo de cada petición admite como máximo **4,5 MB**. El audio de `/probar` en WAV de 16 kHz y 60 s ocupa unos 1,9 MB: entra.
  - Las rutas que llaman a Gemini necesitan `export const maxDuration = 60`, porque tienen 15 s de timeout más un reintento.
  - Telegram responde rápido y procesa después con `after()`.

---

## 7. Comprobación después de cada deploy a producción (2 min)

1. En Deployments, el estado es **READY** y el commit es el esperado.
2. `/` carga y `/probar` responde a "hola".
3. `/panel` sin contraseña → 401.
4. **Logs** (Deployments › Runtime Logs) sin errores rojos nuevos.
5. Si cambió una variable: comprobar que el deploy es **posterior** al cambio.

## 8. Antes de entregar (dom 15:50)
- `git log -p | grep -nE "AIza|EAA[A-Za-z0-9]|[0-9]{8,10}:[A-Za-z0-9_-]{30,}|sb_secret_|service_role"` no muestra **valores** reales.
- `.env.example` sin valores.
- Producción con `DEMO_FIXTURES=auto` y la clave del demo.
- Opcional: rotar las claves personales después del hackathon, porque el repo es público.
