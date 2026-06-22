#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "=== TypeScript compile gate ==="
npx tsc --noEmit | tee tsc-output.txt
ERRORS=$(grep -c "error TS" tsc-output.txt || true)
echo "Errors: $ERRORS"
exit $ERRORS