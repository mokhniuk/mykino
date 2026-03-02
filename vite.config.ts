import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    historyApiFallback: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "My Kino",
        short_name: "My Kino",
        description: "Discover, track, and organize your favourite movies",
        theme_color: "#111111",
        background_color: "#111111",
        display: "standalone",
        scope: "/",
        start_url: "/app",
        orientation: "any",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/($|app)/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "tmdb-api",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-images",
              expiration: { maxEntries: 300, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
    {
      name: 'generate-version-json',
      configureServer(server) {
        server.middlewares.use('/version.json', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ version: pkg.version }));
        });
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: pkg.version })
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
}));
