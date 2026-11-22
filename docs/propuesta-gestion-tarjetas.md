# Cómo la gobernación crea, edita y reemplaza tarjetas y fuentes

**Para:** el equipo en la defensa y el funcionario que operaría el sistema. **Preparado:** dom 22/11, Agente SERVIDOR.

## La idea en una frase
La gobernación puede sumar o cambiar recomendaciones **sin programar**, pero ninguna llega a la gente hasta que **otra persona** la coteja con la página de una fuente oficial. Lo que no está en la fuente no entra.

## Quién hace qué

| Rol | Puede | Ejemplo |
|---|---|---|
| **Editor** | Registrar fuentes y redactar o editar tarjetas (quedan en borrador) | Funcionario de la Unidad de Gestión de Riesgos de la gobernación |
| **Verificador** | Cotejar cada paso con su página y aprobar, o devolver con observaciones. **Nunca lo que redactó él mismo** | Técnico agropecuario, del SENASAG o del municipio |
| **Admin** | Retirar tarjetas, gestionar usuarios y roles | Responsable del sistema |

Hoy existen los roles `tecnico` y `admin` en el panel (login con sesión). Se agregan `editor` y `verificador`.

## Opción 1 · Hoy, sin programar nada nuevo (planilla)
1. El funcionario llena una **planilla modelo** (Excel o Google Sheets) con una fila por tarjeta:
   - amenaza y momento (antes, durante, después);
   - título;
   - pasos 1 a 5;
   - fuente y página de cada paso;
   - por qué importa, evita y pide ayuda (opcionales).
2. El equipo la carga. El sistema **valida solo** y devuelve los errores en lenguaje simple:
   - más de 18 palabras en un paso;
   - dosis, medicinas o diagnósticos;
   - un paso sin fuente o sin página;
   - una fuente que no está registrada.
3. Se arma la **hoja de verificación**: cada paso al lado del texto de la página citada.
4. Otra persona verifica. El sistema registra quién y deja una **huella** del texto: si alguien cambia una coma después, la tarjeta vuelve a necesitar verificación.
5. Al publicar se generan el audio y la imagen PNG, y la tarjeta aparece en el menú del bot y en la web.

**Ya existe:** validación, hoja de verificación, huella, carga, audio y PNG. **Falta:** la planilla modelo y un importador.

## Opción 2 · Siguiente paso: editor en el panel

### Fuentes (`/panel/fuentes`)
- Registrar una fuente con institución, título, año, **enlace al original**, el PDF guardado en privado y la fecha de consulta.
- **Sin un enlace que se pueda abrir, no se puede usar.**
- Una fuente se puede marcar "reemplazada por…" (por ejemplo, un boletín nuevo del Senamhi). Las tarjetas que la citan quedan señaladas para revisión.

### Tarjetas (`/panel/tarjetas`)
- **Crear:** cada paso se escribe **eligiendo una fuente de la lista y su página**. Las reglas se revisan mientras se escribe (palabras, contenido prohibido, de 3 a 5 pasos).
- **Editar sin dejar a nadie sin información:** editar crea una **versión nueva** en borrador. La versión vigente se sigue enviando hasta que la nueva esté verificada.
- **Reemplazar:** la versión nueva, al verificarse, sustituye a la anterior. Queda el historial completo de quién cambió qué, cuándo y por qué.
- **Retirar:** deja de publicar la tarjeta con un motivo escrito, sin borrarla (por ejemplo, "la fuente fue corregida").
- **Al publicar, lo automático:** audio (según el cupo diario), PNG y entrada en el menú según el ámbito (agua, animales, cultivos) y el momento (antes, ahora, después).

### Reglas que el sistema hace cumplir
- Nada se publica sin verificar, y **quien redacta no verifica**.
- Cada paso, el "por qué" y el "evita" llevan fuente y página.
- Sin dosis, medicinas ni diagnósticos.
- Las imágenes son decorativas: sin texto, personas ni consejos dibujados, y se declaran como generadas con IA.
- La IA nunca redacta una recomendación: solo elige entre tarjetas ya verificadas.

### Qué cambia en los datos
- Las fuentes pasan de `data/fuentes.json` a una tabla `sources`.
- Una tabla `lesson_versions` guarda cada versión con su autor, su verificador y su huella.
- Una regla en la base impide que la misma persona redacte y verifique.
- Nuevo campo `ambito` en la tarjeta, para que el menú se arme solo.

## Por qué así
- **Confianza:** cada consejo se puede rastrear hasta la página de un documento oficial. Es lo que el municipio puede defender si alguien pregunta "¿de dónde salió esto?".
- **Continuidad:** la gobernación mantiene el contenido sin depender del equipo que programó el sistema.
- **Sin interrupciones:** editar nunca deja a las comunidades sin la versión anterior mientras se verifica la nueva.

## Respuesta corta para el jurado (20 s)
"Hoy un funcionario llena una planilla y el sistema la valida sola. Otra persona verifica cada paso contra la página de la fuente oficial, y recién ahí se publica, con audio e imagen. El siguiente paso es un editor en el panel con versiones: editar no apaga la tarjeta vigente, quien redacta nunca verifica, y todo queda registrado."
