#!/bin/bash

stop_port() {
  local port=$1
  local name=$2
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "Stopping $name (port $port)..."
    echo "$pids" | xargs kill
    echo "$name stopped."
  else
    echo "$name is not running (port $port)."
  fi
}

stop_port 8080 "backend"
stop_port 4200 "frontend"