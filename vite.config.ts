import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";
import type { IncomingMessage, ServerResponse } from "node:http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
          start_url: "/",
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
          navigateFallbackAllowlist: [/^\/($|app(?:\/|$))/],
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
          server.middlewares.use('/version.json', (_req, res) => {
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
      },
      {
        name: 'gemini-ai-proxy',
        configureServer(server) {
          server.middlewares.use('/api/ai/advisor', async (
            req: IncomingMessage,
            res: ServerResponse,
          ) => {
            if (req.method !== 'POST') {
              res.writeHead(405);
              res.end('Method Not Allowed');
              return;
            }

            const geminiKey = env.GEMINI_API_KEY;
            const openAiKey = env.OPENAI_API_KEY;
            const mistralKey = env.MISTRAL_API_KEY;

            if (!geminiKey && !openAiKey && !mistralKey) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'No AI API Key configured (Gemini, OpenAI, or Mistral)' }));
              return;
            }

            // Read request body
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            const body = Buffer.concat(chunks).toString('utf-8');

            let prompt: string;
            try {
              const parsed = JSON.parse(body) as { prompt?: unknown };
              if (typeof parsed.prompt !== 'string' || parsed.prompt.length > 8000) {
                throw new Error('invalid');
              }
              prompt = parsed.prompt;
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid request body' }));
              return;
            }

            try {
              if (geminiKey) {
                // Use Gemini
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const genai = new GoogleGenerativeAI(geminiKey);
                const model = genai.getGenerativeModel({
                  model: 'gemini-2.0-flash',
                  systemInstruction: `You are a world-class film curator and critic.
You provide thoughtful, non-generic movie and TV recommendations.
You never invent movies or series.
If uncertain about a title, do not include it.
STRICT JSON REQUIREMENT:
1. You MUST respond strictly in valid JSON.
2. Do NOT include markdown code blocks (no \`\`\`json).
3. Do NOT include any preamble, commentary, or post-text.
4. Only output the raw JSON object starting with { and ending with }.
5. Ensure all string values are in the requested language.
6. STRICTURE: You MUST respect all "CONTENT PREFERENCES" and "EXCLUSIONS" listed in the user prompt. Do not suggest movies from excluded countries, languages, or genres.`,
                  generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 2000,
                    responseMimeType: 'application/json',
                  },
                });

                const result = await model.generateContent(prompt);
                const text = result.response.text();

                if (!text || text.trim() === '') {
                  throw new Error('Empty response from Gemini');
                }

                console.log('[Advisor AI Response]:', text.slice(0, 500) + (text.length > 500 ? '...' : ''));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(text);
              } else if (openAiKey) {
                // Use OpenAI
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAiKey}`
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      {
                        role: 'system',
                        content: `You are a world-class film curator and critic.
You provide thoughtful, non-generic movie and TV recommendations.
You never invent movies or series.
If uncertain about a title, do not include it.
You MUST respect all "CONTENT PREFERENCES" and "EXCLUSIONS" listed in the user prompt.
STRICT JSON REQUIREMENT:
1. You must respond strictly in valid JSON.
2. Only output the raw JSON object starting with { and ending with }.
3. Do NOT include markdown blocks or any other text.
4. Ensure all string values are in the requested language.`
                      },
                      {
                        role: 'user',
                        content: prompt
                      }
                    ],
                    temperature: 0.65,
                    response_format: { type: 'json_object' }
                  })
                });

                if (!response.ok) {
                  const errorData = await response.json() as { error?: { message?: string } };
                  throw new Error(errorData.error?.message || `OpenAI error: ${response.status}`);
                }

                const data = await response.json() as { choices: { message: { content: string } }[] };
                const text = data.choices[0].message.content;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(text);
              } else {
                // Use Mistral
                const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mistralKey}`
                  },
                  body: JSON.stringify({
                    model: 'mistral-small-latest',
                    messages: [
                      {
                        role: 'system',
                        content: `You are a world-class film curator and critic.
You provide thoughtful, non-generic movie and TV recommendations.
You never invent movies or series.
If uncertain about a title, do not include it.
You MUST respect all "CONTENT PREFERENCES" and "EXCLUSIONS" listed in the user prompt.
STRICT JSON REQUIREMENT:
1. You must respond strictly in valid JSON.
2. Only output the raw JSON object starting with { and ending with }.
3. Do NOT include markdown blocks or any other text.
4. Ensure all string values are in the requested language.`
                      },
                      {
                        role: 'user',
                        content: prompt
                      }
                    ],
                    temperature: 0.65,
                    response_format: { type: 'json_object' }
                  })
                });

                if (!response.ok) {
                  const errorData = await response.json() as { error?: { message?: string } };
                  throw new Error(errorData.error?.message || `Mistral error: ${response.status}`);
                }

                const data = await response.json() as { choices: { message: { content: string } }[] };
                const text = data.choices[0].message.content;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(text);
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: msg }));
            }
          });
        },
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
  };
});
