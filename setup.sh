#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "  ⚡  Momentum — Setup"
echo "  ─────────────────────────"
echo ""

# Backend
echo "→ Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q --break-system-packages
echo "→ Seeding database..."
python3 seed.py
cd ..

# Icons
echo "→ Generating app icons..."
python3 frontend/generate_icons.py

# Frontend
echo "→ Installing frontend dependencies..."
cd frontend
npm install --silent
echo "→ Building frontend (PWA)..."
npm run build
cd ..

echo ""
echo "  ✅  Setup complete!"
echo ""
echo "  Run  ./start.sh  to launch"
echo "  Then open  http://localhost:8000"
echo ""
echo "  Demo login:  demo@momentum.app / demo123"
echo ""
