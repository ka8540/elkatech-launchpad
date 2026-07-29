import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
/**
 * Deployment identifier attached to issue reports so a bug can be tied to the
 * build it was seen on. Vercel exposes the commit SHA; local dev falls back to
 * "dev". Short SHA only — nothing here is sensitive, but a full ref adds noise.
 */
function resolveAppVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 8);
  return process.env.npm_package_version ?? "dev";
}

export default defineConfig(() => ({
  // Load env vars from the workspace root so VITE_* shared with the backend
  // services (FIREBASE etc.) come from the same .env file.
  envDir: path.resolve(__dirname, "../.."),
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
  server: {
    host: "127.0.0.1",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
