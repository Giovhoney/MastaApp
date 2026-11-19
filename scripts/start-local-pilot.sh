#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
./scripts/start-local-mysql.sh
if [[ ! -f .env.local ]]; then
  echo 'Missing private .env.local database settings.' >&2
  exit 1
fi
npm run dev
