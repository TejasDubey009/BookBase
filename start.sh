#!/usr/bin/env bash
set -e

echo "Starting BookBase System..."
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

exec "$DIR/run.py"
