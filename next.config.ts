import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // El panel sube el PDF del boletín (~1,1 MB) y fotos por Server Actions: el límite por defecto es 1 MB.
  // 4 MB queda por debajo de los 4,5 MB que acepta Vercel por petición.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
