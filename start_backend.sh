#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

stop_port() {
  local port=$1
  local name=$2
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "Stopping $name (port $port)..."
    echo "$pids" | xargs kill
    echo "$name stopped."
  fi
}

stop_port 8080 "backend"
stop_port 4200 "frontend"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "Error: .env file not found at $SCRIPT_DIR/.env"
  exit 1
fi

set -a && source "$SCRIPT_DIR/.env" && set +a

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"

trap 'echo "Stopping..."; kill 0' INT TERM

echo "Starting backend..."
cd "$SCRIPT_DIR/backend"
./mvnw spring-boot:run &

echo "Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm start &

wait
