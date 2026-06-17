#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

stop_port() {
  local port=$1
  local name=$2
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null) || true
  if [ -n "$pids" ]; then
    echo "Stopping $name (port $port)..."
    echo "$pids" | xargs kill
    echo "$name stopped."
  fi
}

stop_port 4200 "frontend"

cd "$SCRIPT_DIR/frontend"
npm start
