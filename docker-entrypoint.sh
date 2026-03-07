#!/bin/sh
set -e

# Inject non-sensitive runtime env vars into window.__ENV__ so the SPA can read them
# without needing a rebuild per deployment. Do NOT expose secret API keys here.
cat > /usr/share/nginx/html/config.js << EOF
window.__ENV__ = {
  AI_PROVIDER:  "${AI_PROVIDER:-}",
  AI_MODEL:     "${AI_MODEL:-}",
  OLLAMA_URL:   "${OLLAMA_URL:-http://localhost:11434}"
};
EOF

exec "$@"
