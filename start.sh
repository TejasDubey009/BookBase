#!/usr/bin/env bash
set -e

echo "Starting BookBase System..."
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Ensure frontend build is present
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend assets..."
    cd frontend && npm run build && cd ..
fi

exec "$DIR/run.py"

