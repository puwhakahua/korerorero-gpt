#!/usr/bin/env bash
set -euo pipefail

# Serve on the port Apache expects
export PORT=3002

# Make Piper’s libs visible to the app
export LD_LIBRARY_PATH="$(pwd)/piper:${LD_LIBRARY_PATH:-}"


# Dev server (what Apache is fronting)
npx next dev -p "$PORT"

# For production:
# npm run build
#PORT=$PORT npm run start
