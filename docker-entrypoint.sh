#!/bin/sh
set -e

# Inject runtime env vars into window.__ENV__ so the SPA can read them
# without needing a rebuild per deployment.
cat > /usr/share/nginx/html/config.js << EOF
window.__ENV__ = {
  TMDB_API_KEY: "${TMDB_API_KEY:-}",
  AI_PROVIDER:  "${AI_PROVIDER:-}",
  AI_API_KEY:   "${AI_API_KEY:-}",
  AI_MODEL:     "${AI_MODEL:-}",
  OLLAMA_URL:   "${OLLAMA_URL:-http://localhost:11434}"
};
EOF

exec "$@"
