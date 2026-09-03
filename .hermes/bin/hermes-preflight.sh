#!/usr/bin/env bash
set -euo pipefail

echo "=== Hermes Preflight: Valgate Webapp ==="

# Check Node / npm
node --version || { echo "node missing"; exit 1; }
npm --version || { echo "npm missing"; exit 1; }

# Check required env keys are present (not values)
if [ ! -f .env ]; then
  echo "WARNING: .env file not found"
fi

# Lint
echo "=== lint ==="
npm run lint

# Type check
echo "=== typecheck ==="
npm run typecheck

# Unit tests
echo "=== test ==="
npm run test

echo "=== Preflight PASSED ==="
