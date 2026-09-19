#!/usr/bin/env bash
# Builds the clickable preview: sign-in and the backend simulated in the
# browser, hash routing so it works from plain static hosting, and no contact
# with any Google auth service. Never deploy this build.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist-demo
VITE_DEMO=1 \
VITE_GOOGLE_CLIENT_ID=preview-not-a-real-client.apps.googleusercontent.com \
VITE_APPS_SCRIPT_ENDPOINT=https://preview.invalid/exec \
VITE_ALLOWED_EMAIL_DOMAIN=startupmission.in \
  npx vite build --base=./ --outDir dist-demo

# The real Google script tag has no business in a build that stubs sign-in.
python3 - <<'PY'
p = "dist-demo/index.html"
s = open(p).read()
s = s.replace('    <script src="https://accounts.google.com/gsi/client" async defer></script>\n', "")
s = s.replace("<title>KSUM Media Box</title>", "<title>KSUM Media Box — Preview</title>")
open(p, "w").write(s)
PY

# A production build must never carry the demo shim.
if grep -rq "installDemoMode" dist 2>/dev/null; then
  echo "ERROR: demo code found in dist/ - do not deploy" >&2
  exit 1
fi

echo "Preview built in dist-demo/. Serve it with: python3 -m http.server 4173 -d dist-demo"
