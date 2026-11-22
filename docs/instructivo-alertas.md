# Alertas: cómo funcionan y cómo enviar una

**Para:** la técnica del municipio y el equipo que hace la demo · **Actualizado:** dom 22/11

## 1. Cómo entran los avisos
| Origen | Cómo llega | Qué hace el sistema |
|---|---|---|
| **Boletín agrometeorológico decenal** del Senamhi (Altiplano) | Se revisa **cada 30 min** (GitHub Actions), una vez al día por Vercel, o con **«Buscar boletín ahora»** en el panel | Descarga el PDF, Gemini extrae zona, fechas, fenómeno y citas literales, el código decide si corresponde alertar y crea la alerta en **borrador**. Avisa a la técnica por Telegram |
| **Comunicado de última hora** (alerta de color del Senamhi) | La técnica lo carga en **Ingresar › Alertas › Comunicado de última hora** | Crea la alerta en **borrador** con el texto y el enlace oficiales, sin IA |

**Nada se envía sin que una persona apruebe.**

## 2. Enviar un comunicado de última hora (3 pasos)
1. **Cargar.** En `/panel/alertas`, sección «Comunicado de última hora»:
   - Fenómeno (helada, nevada o sequía), nivel (amarillo, naranja o rojo), zona y fechas.
   - **Texto del comunicado**, copiado tal cual (máximo 200 caracteres).
   - **Enlace oficial** (https://…). Cada comunicado necesita un enlace distinto.
   - Pulsa **Crear alerta en borrador**.
2. **Aprobar.** En la alerta nueva, revisa el mensaje y pulsa **Aprobar**. Se genera el audio, unos segundos.
3. **Enviar.** Pulsa **Enviar**. Llega a todas las personas suscritas: texto con el nivel, qué hacer, enlace oficial y audio.

## 3. Simulacro (para ensayar o para la demo)
- Marca **«Es un simulacro»** al cargar.
- El mensaje empieza con **«SIMULACRO ·»** y el audio dice **«Esto es un simulacro»** al inicio y **«Repito: es un simulacro»** al final.
- **No armen un comunicado falso del Senamhi.** Escriban un texto que diga que es una prueba, o usen el de un aviso real pasado.

## 4. Demo sugerida (unos 3 minutos)
1. **Antes:** los teléfonos del equipo suscritos al bot de Telegram (@pacha_oruro_bot), con comunidad elegida. Pulsa **Reiniciar demo** en el panel.
2. **Aviso real:** **Buscar boletín ahora** → alerta 🟠 de helada en borrador (boletín real del 14–23 nov) → **Aprobar** → **Enviar**. Los teléfonos reciben la alerta.
3. **Emergencia simulada:** «Comunicado de última hora» con **Simulacro** → **Aprobar** → **Enviar**.
4. **Respuesta de la comunidad:** un audio («se nos heló la papa…»), confirmar con **Sí**. El mapa cambia.

**Revisión automática y demo:** después de Reiniciar demo, la revisión automática vuelve a encontrar el boletín real en menos de 30 minutos. Para pulsar «Buscar boletín ahora» en vivo, pausa antes el workflow en GitHub (**Actions › «Revisar boletín del Senamhi» › Disable workflow**) y reactívalo después.

## 5. Reiniciar demo
| Borra | Conserva |
|---|---|
| Alertas y sus envíos, boletines y comunicados (y sus PDF), reportes, entregas, envíos de tarjetas por problema | Personas suscritas, tarjetas, audios de tarjetas, usuarios del panel |

Después vuelve a cargar las comunidades, reportes y entregas de demostración.

## 6. Dónde se ven las fuentes
- **Mensaje de la alerta:** enlace al documento original.
- **`/fuentes`:** lista pública de boletines y comunicados usados, con su resultado, el enlace original y la copia guardada (PDF).
- **Panel:** «Fuente original» y «Copia guardada (PDF)» en cada alerta.

## 7. Configuración (una sola vez)
- **`CRON_SECRET`:** el mismo valor en el `.env`, en Vercel (Production) y en GitHub (**Settings › Secrets and variables › Actions**). Sin él, la revisión automática no entra.
- **`TECNICA_CONTACTO`** (`telegram:<chat_id>`): a quién avisar cuando hay una alerta en borrador.
