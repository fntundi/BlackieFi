#!/bin/sh
set -e

# Runtime Environment Variable Injection
# ======================================
# This script injects environment variables into the built JS files at runtime.
# This allows the same image to be deployed to different environments.

# Directory containing built files
HTML_DIR="/usr/share/nginx/html"

# If runtime env vars are set, inject them into the app
if [ -n "$RUNTIME_BASE44_APP_ID" ] || [ -n "$RUNTIME_BASE44_APP_BASE_URL" ]; then
    echo "Injecting runtime environment variables..."
    
    # Create a config.js file that will be loaded before the app
    cat > "$HTML_DIR/config.js" << EOF
window.__RUNTIME_CONFIG__ = {
    VITE_BASE44_APP_ID: "${RUNTIME_BASE44_APP_ID:-}",
    VITE_BASE44_APP_BASE_URL: "${RUNTIME_BASE44_APP_BASE_URL:-}",
    VITE_BASE44_FUNCTIONS_VERSION: "${RUNTIME_BASE44_FUNCTIONS_VERSION:-}"
};
EOF

    # Inject config.js script tag into index.html (before other scripts)
    sed -i 's|<head>|<head><script src="/config.js"></script>|' "$HTML_DIR/index.html"
fi

echo "Starting Nginx..."
exec "$@"
