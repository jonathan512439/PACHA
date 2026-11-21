# Supabase paso a paso (A) — contratos v0.2

**Tiempo estimado:** unos 20 minutos.
**Resultado:** base de datos con las 10 tablas, 5 buckets, RLS activado, claves en `.env.local` y en Vercel, y una prueba automática en verde.

> **Regla de oro:** la **clave secreta** (`sb_secret_…` o `service_role`) da acceso total. Va solo en `.env.local` y en las variables de Vercel. **Nunca** en el repo, en el chat del grupo ni en una variable `NEXT_PUBLIC_…`.

---

## Paso 1 · Crear el proyecto
1. Entra a <https://supabase.com/dashboard> e inicia sesión. Con GitHub es lo más rápido.
2. Si te lo pide, crea una **organización** con el plan **Free**.
3. **New project** con estos datos:
   - **Name:** `pacha` (o el nombre final del proyecto).
   - **Database password:** pulsa *Generate* y **guárdala en tu gestor de contraseñas**. No va al repo y para la app no hace falta.
   - **Region:** *South America (São Paulo)*, la más cercana a Bolivia.
   - Si aparece **"Enable Data API"**, déjala **activada**: la librería `supabase-js` la usa.
   - Las demás opciones, por defecto.
4. Pulsa **Create new project** y espera 1–2 minutos hasta que el proyecto aparezca como listo.

## Paso 2 · Crear las tablas
1. Menú lateral › **SQL Editor** › **New query**.
2. Abre `contratos/schema.sql` en VS Code, copia **todo** el contenido y pégalo.
3. Pulsa **Run**. Tiene que aparecer *"Success. No rows returned"*.
   - Si dice *"relation … already exists"*, el proyecto no estaba vacío. Avísame antes de borrar nada.
   - Si aparece un aviso sobre *destructive operations*, no aplica: este script solo crea tablas.

## Paso 3 · Crear los buckets de Storage
1. **SQL Editor** › **New query**.
2. Pega el contenido de `contratos/storage.sql` y pulsa **Run**.

## Paso 4 · Revisar en el panel (2 min)
- **Table Editor:** tienen que aparecer **10 tablas**: `stations`, `communities`, `subscribers`, `inbound_messages`, `lessons`, `bulletins`, `alerts`, `alert_deliveries`, `reports` y `deliveries`.
  - Ninguna debe tener la advertencia *"RLS disabled"*. Si sale un aviso de que **RLS está activado sin políticas**, es lo esperado: así la clave pública no ve nada.
  - `stations` tiene 2 filas: `oruro-ciudad` y `oruro-aeropuerto`.
- **Storage:** tienen que aparecer **5 buckets**. `audios`, `tarjetas`, `entregas` y `boletines` son **Public**. `reportes` es **Private**, porque guarda las voces de las personas.

## Paso 5 · Copiar las claves
1. Ve a **Project Settings** (engranaje) › **API Keys**. En algunos paneles se llama *Data API*.
2. Copia estos dos valores:
   - **Project URL**: `https://<ref>.supabase.co`. Está en *Project Settings › Data API* o en el botón **Connect**.
   - **Secret key** (`sb_secret_…`). Si tu panel solo muestra las claves antiguas, usa **service_role** en la pestaña *Legacy API keys*.
3. **Para la prueba del paso 6** copia también la **Publishable key** (`sb_publishable_…`) o la **anon**. La app no la usa; sirve solo para comprobar que RLS bloquea.

## Paso 6 · Probar la conexión desde tu máquina
1. Crea el archivo `scratch/.env.local` (el `.gitignore` ya lo excluye):
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<clave secreta>
   SUPABASE_ANON_KEY=<clave pública, solo para la prueba>
   ```
2. En la terminal:
   ```
   cd scratch
   npm i @supabase/supabase-js
   node --env-file=.env.local probar-supabase.mjs
   ```
3. Todo tiene que salir `OK` y al final *"Supabase listo para v0.2."*. El script comprueba:
   - que existen las tablas y las estaciones;
   - que se rechazan una tarjeta `verificada` sin `verified_by`, un id inválido y un canal desconocido;
   - que existen los buckets y si son públicos o privados;
   - que se puede subir y borrar un archivo;
   - que la clave pública no ve nada.
   - Si algo sale `ERR`, pásame la salida.

## Paso 7 · Conectar con la app (cuando B tenga el proyecto de Next y Vercel)
1. **Local:** en la **raíz del repo**, crea `.env.local` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. **No** agregues la clave pública: la app no la usa.
2. **Vercel:** *Project › Settings › Environment Variables*.
   - Agrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` para **Production, Preview y Development**.
   - Marca la clave como **Sensitive** si te da la opción.
   - Después haz **Redeploy**: las variables nuevas solo se aplican en el siguiente deploy.
3. **`.env.example`** (este sí va al repo, **sin valores**):
   ```
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-3.5-flash-lite
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_WEBHOOK_SECRET=
   WHATSAPP_TOKEN=
   WHATSAPP_PHONE_NUMBER_ID=
   WHATSAPP_VERIFY_TOKEN=
   WHATSAPP_APP_SECRET=
   PANEL_USERS=
   CRON_SECRET=
   TECNICA_CONTACTO=
   DEMO_FIXTURES=auto
   PROBAR_TOPE_DIARIO=
   GROQ_API_KEY=
   ```

## Paso 8 · Dar acceso al equipo
- *Organization › Team › Invite*: invita a B y C con el rol **Developer**. Así pueden ver tablas y logs desde el panel.
- Las claves se pasan **por mensaje privado**, una vez, y cada quien las guarda en su `.env.local`.

## Si la prueba da "permission denied for table …"
El proyecto se creó sin exponer automáticamente las tablas nuevas, y `service_role` no tiene permisos de datos. `schema.sql` v0.2 ya los incluye (sección "Permisos"). En un proyecto creado con una versión anterior, ejecuta en el SQL Editor:
```sql
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
```

## Lista de seguridad (antes de seguir)
- [ ] La clave secreta no aparece en ningún archivo fuera de `.env.local`. Para comprobarlo: `git grep -n "sb_secret_\|service_role"` no debe devolver valores.
- [ ] Ninguna variable `NEXT_PUBLIC_SUPABASE_*` en el proyecto.
- [ ] El bucket `reportes` es **Private**.
- [ ] Si una clave se filtra: en *API Keys* se **rota** (*Roll* o *Revoke*), se actualiza `.env.local` y Vercel, y se hace redeploy.

## Para tener en cuenta
- El plan Free **pausa el proyecto tras 1 semana sin actividad** (se reactiva desde el panel). Hay que mencionarlo en el README para el jurado.
- Límites gratis: **500 MB** de base de datos y **1 GB** de Storage. Para el demo sobra.
- **Rehacer desde cero:** lo más limpio es crear un proyecto nuevo y repetir los pasos 2 a 6. "Reiniciar demo" (B) solo borra y vuelve a cargar **datos**; no toca el esquema.
