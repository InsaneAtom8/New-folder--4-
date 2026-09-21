#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status, and trap signals for cleanup
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down PotholeVision AI services..."
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  echo "Shutdown complete."
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

echo "=========================================================="
echo "    Starting PotholeVision AI Platform (Backend & Frontend)"
echo "=========================================================="

# 1. Check Node.js / npm
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to launch the React frontend application." >&2
  exit 1
fi

# 2. Check Python interpreter
PYTHON=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON="python"
fi

if [[ -z "$PYTHON" ]]; then
  echo "Error: Python 3 is required to run the local YOLO FastAPI server." >&2
  exit 1
fi

# 3. Verify Node dependencies
if [[ ! -d "node_modules" ]]; then
  echo "[Frontend] Installing npm packages..."
  npm install
fi

# 4. Launch Backend Python FastAPI YOLO server
echo "[Backend] Starting local YOLO detector API server on http://localhost:8000..."
"$PYTHON" -m uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Brief pause to give backend time to initialize model weights
sleep 2

# 5. Launch Vite React Frontend
echo "[Frontend] Launching React Development Server..."
npm run dev -- --host 0.0.0.0 --port 3000