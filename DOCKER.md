# MyKino Docker Guide: Community Edition

This guide explains how to build, run, and customize the **Community Edition** of MyKino using Docker.

## 🌟 The Community Edition

The Community Edition is a "clean" version of the app designed specifically for self-hosting. Compared to the production build seen on [mykino.app](https://mykino.app), it:
- **Excludes marketing bloat**: No Landing, Pricing, or Legal pages are generated or served.
- **Auto-redirects**: Visiting the root domain or `/` automatically takes you to the app shell (`/app`).
- **Privacy-first**: No cloud sync dependencies or managed AI limits are baked in.

## 🚀 Quick Start (Pre-built Image)

If you are using a pre-built community image:

```bash
docker run -d -p 9999:9999 \
  -e TMDB_API_KEY=your_tmdb_key \
  -e AI_PROVIDER=openai \
  -e AI_API_KEY=your_openai_key \
  mokhniuk/mykino:community
```
Access the app at `http://localhost:9999`.

## 🛠️ Building the Community Image

To build the community version from source, use the `--build-arg IS_COMMUNITY=true` flag:

```bash
docker build --build-arg IS_COMMUNITY=true -t mykino:community .
```

Alternatively, use the convenient npm script:
```bash
npm run build:community
```

## ⚙️ Configuration (Environment Variables)

All configuration is done via environment variables at runtime.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `TMDB_API_KEY` | **Required**. Get a free key at [themoviedb.org](https://www.themoviedb.org/settings/api). | `abc123...` |
| `AI_PROVIDER` | AI provider for natural language recommendations. | `openai`, `anthropic`, `gemini`, `mistral`, `ollama` |
| `AI_API_KEY` | Your private API key for the chosen provider. | `sk-...` |
| `AI_MODEL` | (Optional) Override the default model for that provider. | `gpt-4o` |
| `OLLAMA_URL` | (Optional) Base URL for Ollama. Defaults to `http://localhost:11434`. | `http://192.168.1.50:11434` |
| `SUPABASE_URL` | (Optional) Your own Supabase URL for cross-device sync. | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | (Optional) Your own Supabase Anon Key. | `eyJhbG...` |

## 📦 Docker Compose

The easiest way to run MyKino is with `docker-compose.yml`.

```yaml
version: "3.8"
services:
  mykino:
    image: mokhniuk/mykino:community
    ports:
      - "9999:9999"
    environment:
      - TMDB_API_KEY=your_key
      - AI_PROVIDER=openai
      - AI_API_KEY=sk-your-ai-key
    restart: unless-stopped
```

## 🏠 CasaOS / BigBearCasaOS

MyKino is fully compatible with CasaOS. Our `docker-compose.yml` includes `x-casaos` metadata that helps CasaOS present a beautiful configuration UI.

### Option 1: Custom Install
1. Open CasaOS and click **App Store** -> **Custom Install** (top right).
2. Click **Import** (top right) and paste the contents of our **[docker-compose.yml](docker-compose.yml)**.
3. CasaOS will automatically populate the Icon, Port, and Description.
4. Fill in your `TMDB_API_KEY` and `AI_API_KEY` in the **Environment Variables** section.
5. Click **Submit**.

### Option 2: Manual Setup
If you are adding the image manually:
- **Image**: `mokhniuk/mykino:community`
- **Web Port**: Map host port `9999` to container port `9999`.
- **Environment**: Add `TMDB_API_KEY`, `AI_PROVIDER`, and `AI_API_KEY` manually using the "+" button in the Environment section.

## 🔐 Privacy & Security

- **Your Keys, Your Infrastructure**: API keys are injected into the frontend at runtime via a generated `config.js`. They are stored in your container environment and never sent to any third-party "Managed AI" proxy.
- **No Analytics**: The community image does not include tracking or telemetry.
- **Offline First**: Once loaded, the app shell is cached via Service Workers and works offline.
