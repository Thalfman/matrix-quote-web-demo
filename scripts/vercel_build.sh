#!/usr/bin/env bash
# Vercel build entrypoint for the static demo site.
#
# Vercel's default build image provides python3 + pip out of the box. This script
# converts the committed CSV fixtures into JSON/joblib assets under
# frontend/public/demo-assets/ and then runs the Vite demo build.
set -euo pipefail

echo "[vercel-build] installing python deps"
python3 -m pip install --quiet --disable-pip-version-check pandas numpy scikit-learn joblib

echo "[vercel-build] building demo static assets"
python3 scripts/build_demo_static.py

echo "[vercel-build] building frontend in demo mode"
cd frontend
VITE_DEMO_MODE=1 npm run build
