#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "Error: .env file not found at $SCRIPT_DIR/.env"
  exit 1
fi

set -a && source "$SCRIPT_DIR/.env" && set +a

cd "$SCRIPT_DIR/backend"
./mvnw spring-boot:run
