#!/bin/sh
set -e

# Inject runtime env vars into window.__ENV__ so the SPA can read them
# without needing a rebuild per deployment.
#
# Production (mykino.app):
#   Set AI_PROXY_URL to your backend server. Do NOT set AI_API_KEY.
#
# Community (self-hosted Docker):
#   Set AI_API_KEY + AI_PROVIDER to use AI directly from the browser.
#   Your key stays on your own server — it's your infrastructure.
#   Leave AI_PROXY_URL empty.
cat > /usr/share/nginx/html/config.js << EOF
window.__ENV__ = {
  AI_PROXY_URL:       "${AI_PROXY_URL:-}",
  AI_PROVIDER:        "${AI_PROVIDER:-}",
  AI_MODEL:           "${AI_MODEL:-}",
  AI_API_KEY:         "${AI_API_KEY:-}",
  AI_FREE_DAILY_LIMIT:"${AI_FREE_DAILY_LIMIT:-3}",
  OLLAMA_URL:         "${OLLAMA_URL:-http://localhost:11434}",
  SUPABASE_URL:       "${SUPABASE_URL:-}",
  SUPABASE_ANON_KEY:  "${SUPABASE_ANON_KEY:-}"
};
EOF

exec "$@"
