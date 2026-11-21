import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  css: { modules: { generateScopedName: "[local]" } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    css: { include: [/\.module\.css$/] },
  },
});
