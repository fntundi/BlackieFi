#!/bin/sh
set -e

# Runtime Environment Variable Injection
# ======================================
# This script injects environment variables into the built JS files at runtime.
# This allows the same image to be deployed to different environments.

# Directory containing built files
HTML_DIR="/usr/share/nginx/html"

# If runtime env vars are set, inject them into the app
if [ -n "$RUNTIME_SUPABASE_URL" ] || [ -n "$RUNTIME_SUPABASE_ANON_KEY" ]; then
    echo "Injecting runtime environment variables..."
    
    # Create a config.js file that will be loaded before the app
    cat > "$HTML_DIR/config.js" << EOF
window.__RUNTIME_CONFIG__ = {
    VITE_SUPABASE_URL: "${RUNTIME_SUPABASE_URL:-}",
    VITE_SUPABASE_ANON_KEY: "${RUNTIME_SUPABASE_ANON_KEY:-}",
    VITE_SUPABASE_SERVICE_ROLE_KEY: "${RUNTIME_SUPABASE_SERVICE_ROLE_KEY:-}"
};
EOF

    # Inject config.js script tag into index.html (before other scripts)
    if ! grep -q 'config.js' "$HTML_DIR/index.html"; then
        sed -i 's|<head>|<head><script src="/config.js"></script>|' "$HTML_DIR/index.html"
    fi
fi

echo "Starting Nginx..."
exec "$@"
