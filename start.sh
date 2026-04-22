#!/bin/bash
cd "$(dirname "$0")"

cleanup() {
  echo ""
  echo "  Stopping Momentum..."
  kill $SERVER_PID 2>/dev/null
  wait $SERVER_PID 2>/dev/null
  echo "  Goodbye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo "  ⚡  Momentum — Personal Productivity OS"
echo "  ──────────────────────────────────────"
echo ""

# Detect local IP for phone access
LOCAL_IP=$(ip -4 addr show scope global 2>/dev/null | grep inet | awk '{print $2}' | cut -d/ -f1 | head -1)
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="YOUR_PC_IP"
fi

# Rebuild frontend if source is newer than build
if [ ! -d "backend/static_dist" ] || \
   [ "$(find frontend/src -newer backend/static_dist/index.html 2>/dev/null | head -1)" != "" ]; then
  echo "→ Building frontend..."
  cd frontend && npm run build && cd ..
  echo ""
fi

# Start single server (serves API + frontend)
echo "→ Starting server on port 8000..."
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!
cd ..

sleep 2

echo ""
echo "  ✅  Momentum is running!"
echo "  ──────────────────────────────────────"
echo "  On this PC:  http://localhost:8000"
echo "  On phone:    http://${LOCAL_IP}:8000"
echo "  API docs:    http://localhost:8000/docs"
echo ""
echo "  📱 To install on phone:"
echo "     Android → open http://${LOCAL_IP}:8000 in Chrome"
echo "               tap menu ⋮ → 'Add to Home Screen'"
echo "     iPhone  → open in Safari → Share ⬆ → 'Add to Home Screen'"
echo ""
echo "  Demo login:  demo@momentum.app / demo123"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

wait
