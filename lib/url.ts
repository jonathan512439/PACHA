/** URL pública de la app (para enlaces en mensajes y QR). En Vercel sale del dominio de producción. */
export const urlApp = () =>
  process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
