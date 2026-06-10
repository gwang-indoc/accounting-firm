#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$SCRIPT_DIR/.env.prod" ]; then
  echo "Error: .env.prod file not found at $SCRIPT_DIR/.env.prod"
  exit 1
fi

set -a && source "$SCRIPT_DIR/.env.prod" && set +a

export SPRING_PROFILES_ACTIVE=prod

cd "$SCRIPT_DIR/backend"
./mvnw spring-boot:run
