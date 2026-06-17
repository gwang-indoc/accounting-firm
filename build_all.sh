#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building backend (skip tests)..."
cd "$SCRIPT_DIR/backend"
./mvnw clean package -DskipTests

echo "==> Building frontend..."
cd "$SCRIPT_DIR/frontend"
npm run build

echo "==> Build complete."
