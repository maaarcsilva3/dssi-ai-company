import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        // agent-sdk serve --mode single mounts routes at /v1/... (no slug prefix)
        rewrite: (path) => path.replace(/^\/api/, ""),
        // HQ CSRF guard compares Origin host to the serve host. Browser Origin
        // is :5173 while the proxied target is :3000 → forbidden_origin.
        // Strip browser Origin so the proxy looks like a local non-browser client.
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("referer");
            proxyReq.removeHeader("sec-fetch-site");
            proxyReq.removeHeader("sec-fetch-mode");
            proxyReq.removeHeader("sec-fetch-dest");
          });
        },
      },
    },
  },
});
