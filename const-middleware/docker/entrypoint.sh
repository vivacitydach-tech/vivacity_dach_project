#!/bin/sh
set -e
echo "Waiting for database..."
npx prisma db push --skip-generate
if [ "${RUN_SEED:-true}" = "true" ]; then
  if [ -f dist/prisma/seed.js ]; then
    node dist/prisma/seed.js || echo "Seed skipped or already applied"
  elif [ -f prisma/seed.ts ]; then
    npx ts-node --transpile-only prisma/seed.ts || echo "Seed skipped or already applied"
  fi
fi
if [ -f dist/main.js ]; then
  exec node dist/main.js
elif [ -f dist/src/main.js ]; then
  exec node dist/src/main.js
else
  echo "FATAL: main.js not found under dist/"
  find dist -name 'main.js' || true
  exit 1
fi