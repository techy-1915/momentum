#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Momentum — Cloud Deployment Helper
#  Deploys the backend to Render.com (free tier) so the Android APK and
#  your iPhone PWA work from anywhere without the laptop being on.
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo ""
echo -e "${CYAN}  ⚡  Momentum — Cloud Deployment${NC}"
echo "  ──────────────────────────────────────────"
echo ""

# Check for git
if ! git status &>/dev/null; then
  echo "→ Initializing git repository..."
  git init
  echo "backend/momentum.db"  >> .gitignore
  echo "backend/__pycache__/" >> .gitignore
  echo "backend/*.db"         >> .gitignore
  echo "frontend/node_modules/" >> .gitignore
  echo "frontend/dist/"        >> .gitignore
  echo "frontend/dev-dist/"    >> .gitignore
  echo "backend/static_dist/"  >> .gitignore
  echo "*.apk"                  >> .gitignore
  echo ".env.android"           >> .gitignore
  git add .
  git commit -m "Initial Momentum commit"
fi

echo ""
echo -e "${YELLOW}  STEP 1 — Push to GitHub${NC}"
echo "  ─────────────────────────────────────"
echo "  1. Go to https://github.com/new"
echo "  2. Create a new PRIVATE repository called 'momentum'"
echo "  3. Copy the repository URL and paste here:"
echo ""
read -rp "  GitHub repo URL (or Enter to skip): " REPO_URL

if [ -n "$REPO_URL" ]; then
  git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
  git push -u origin main 2>/dev/null || git push -u origin master
  echo -e "${GREEN}  ✓ Pushed to GitHub${NC}"
fi

echo ""
echo -e "${YELLOW}  STEP 2 — Deploy on Render.com (FREE)${NC}"
echo "  ─────────────────────────────────────"
echo "  1. Go to https://render.com → sign up (free)"
echo "  2. Click 'New +' → 'Web Service'"
echo "  3. Connect your GitHub and select the 'momentum' repo"
echo "  4. Render auto-detects render.yaml — click Deploy"
echo "  5. Wait ~3 minutes for first deploy"
echo "  6. Copy your URL: https://momentum-XXXX.onrender.com"
echo ""
read -rp "  Paste your Render URL here when ready: " RENDER_URL

if [ -n "$RENDER_URL" ]; then
  # Strip trailing slash
  RENDER_URL="${RENDER_URL%/}"

  # Save to .env.android for APK builds
  sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$RENDER_URL|" frontend/.env.android
  echo ""
  echo -e "${GREEN}  ✓ Saved: $RENDER_URL${NC}"

  # Test the deployment
  echo "→ Testing deployment..."
  if curl -sf "$RENDER_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Backend is live!${NC}"
  else
    echo -e "${YELLOW}  ⚠ Backend may still be starting up. Try again in 2 minutes.${NC}"
  fi

  # Seed the cloud database
  echo ""
  read -rp "  Seed demo data on the cloud server? [y/N]: " SEED
  if [[ "$SEED" =~ ^[Yy]$ ]]; then
    curl -sf -X POST "$RENDER_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d '{"email":"demo@momentum.app","password":"demo123","name":"Demo User"}' \
      > /dev/null && echo -e "${GREEN}  ✓ Demo account created${NC}" || echo "  (account may already exist)"
  fi

  echo ""
  echo -e "${GREEN}  ✅  Cloud deployment ready!${NC}"
  echo "  ──────────────────────────────────────────"
  echo -e "  URL:  ${CYAN}$RENDER_URL${NC}"
  echo ""
  echo "  Now build your APK:"
  echo "    ./build-apk.sh"
  echo ""
  echo "  iPhone PWA — open in Safari:"
  echo "    $RENDER_URL"
  echo "    → Share ⬆ → Add to Home Screen"
fi
