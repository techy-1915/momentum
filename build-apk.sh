#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Momentum — Android APK Builder
#  Builds a signed debug APK you can install directly on any Android phone.
#  Requires: Java 17+ (already installed), Node.js, internet for first run.
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo ""
echo -e "${CYAN}  ⚡  Momentum — APK Builder${NC}"
echo "  ──────────────────────────────────────────"
echo ""

# ── 1. Check Java ─────────────────────────────────────────────────────────────
if ! java -version &>/dev/null; then
  echo -e "${RED}✗ Java not found. Install Java 17+:${NC}"
  echo "    sudo apt install openjdk-17-jdk"
  exit 1
fi
JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)
echo -e "${GREEN}✓ Java ${JAVA_VER} found${NC}"

# ── 2. Download Android SDK if needed ────────────────────────────────────────
SDK_ROOT="$HOME/.android-sdk"
SDKMANAGER="$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"

if [ ! -f "$SDKMANAGER" ]; then
  echo ""
  echo "→ Downloading Android SDK command-line tools (~120 MB, one-time)..."
  mkdir -p "$SDK_ROOT/cmdline-tools"
  TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
  wget -q --show-progress "$TOOLS_URL" -O /tmp/android-cmdtools.zip
  unzip -q /tmp/android-cmdtools.zip -d /tmp/android-cmdtools-unzipped/
  mv /tmp/android-cmdtools-unzipped/cmdline-tools "$SDK_ROOT/cmdline-tools/latest"
  rm -rf /tmp/android-cmdtools.zip /tmp/android-cmdtools-unzipped
  echo -e "${GREEN}✓ Android SDK tools downloaded${NC}"
fi

export ANDROID_HOME="$SDK_ROOT"
export PATH="$PATH:$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools"

# ── 3. Install required SDK packages ─────────────────────────────────────────
if [ ! -d "$SDK_ROOT/platforms/android-34" ]; then
  echo ""
  echo "→ Installing Android SDK packages (~600 MB, one-time)..."
  yes | "$SDKMANAGER" --licenses > /dev/null 2>&1 || true
  "$SDKMANAGER" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "platform-tools" \
    --sdk_root="$SDK_ROOT"
  echo -e "${GREEN}✓ Android SDK packages installed${NC}"
else
  echo -e "${GREEN}✓ Android SDK packages already installed${NC}"
fi

# ── 4. Get cloud API URL ──────────────────────────────────────────────────────
echo ""
if [ -f "frontend/.env.android" ]; then
  source <(grep -v '^#' frontend/.env.android | grep '=')
fi

if [ -z "$VITE_API_URL" ]; then
  echo -e "${YELLOW}⚠  What is your cloud backend URL?${NC}"
  echo "   (Deploy first: see deploy-cloud.sh)"
  echo "   Leave blank to use LOCAL network (phone must be on same WiFi):"
  read -rp "   URL [e.g. https://momentum-xyz.onrender.com]: " INPUT_URL
  VITE_API_URL="${INPUT_URL:-}"
fi

if [ -z "$VITE_API_URL" ]; then
  # Detect local IP for same-WiFi use
  LOCAL_IP=$(ip -4 addr show scope global 2>/dev/null | grep inet | awk '{print $2}' | cut -d/ -f1 | head -1)
  VITE_API_URL="http://${LOCAL_IP:-192.168.1.100}:8000"
  echo -e "${YELLOW}  Using local network URL: $VITE_API_URL${NC}"
  echo "  (Phone must be on same WiFi as this PC)"
else
  echo -e "${GREEN}  Backend URL: $VITE_API_URL${NC}"
fi

# Save it
sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$VITE_API_URL|" frontend/.env.android

# ── 5. Build React frontend (Android mode) ───────────────────────────────────
echo ""
echo "→ Building frontend for Android..."
cd frontend
VITE_API_URL="$VITE_API_URL" npm run build:android
echo -e "${GREEN}✓ Frontend built → dist/${NC}"

# ── 6. Init Capacitor Android project (first time) ───────────────────────────
if [ ! -d "android" ]; then
  echo ""
  echo "→ Creating Android project (first time)..."
  npx cap add android
fi

# ── 7. Sync web assets into Android project ───────────────────────────────────
echo ""
echo "→ Syncing assets into Android project..."
npx cap sync android
echo -e "${GREEN}✓ Synced${NC}"

# ── 8. Configure Android project ──────────────────────────────────────────────
# Set min/target SDK
GRADLE="android/app/build.gradle"
if grep -q "minSdkVersion 22" "$GRADLE" 2>/dev/null; then
  : # already configured
elif [ -f "$GRADLE" ]; then
  sed -i 's/minSdkVersion .*/minSdkVersion 26/' "$GRADLE"
  sed -i 's/targetSdkVersion .*/targetSdkVersion 34/' "$GRADLE"
  sed -i 's/compileSdkVersion .*/compileSdkVersion 34/' "$GRADLE"
fi

# Allow cleartext HTTP (for local-network mode)
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ] && ! grep -q "usesCleartextTraffic" "$MANIFEST"; then
  sed -i 's/<application/<application android:usesCleartextTraffic="true"/' "$MANIFEST"
fi

# ── 9. Build APK ──────────────────────────────────────────────────────────────
echo ""
echo "→ Building APK (this takes 1-3 minutes first time)..."
cd android
export ANDROID_HOME="$SDK_ROOT"
chmod +x gradlew
./gradlew assembleDebug \
  -Pandroid.sdk.path="$SDK_ROOT" \
  --no-daemon --quiet
cd ..

# ── 10. Copy APK to easy location ─────────────────────────────────────────────
APK_SRC="android/app/build/outputs/apk/debug/app-debug.apk"
APK_DEST="../Momentum.apk"

if [ -f "$APK_SRC" ]; then
  cp "$APK_SRC" "$APK_DEST"
  APK_SIZE=$(du -sh "$APK_DEST" | cut -f1)
  echo ""
  echo -e "${GREEN}  ✅  APK READY!${NC}"
  echo "  ──────────────────────────────────────────"
  echo -e "  File:  ${CYAN}$(realpath $APK_DEST)${NC}"
  echo -e "  Size:  ${APK_SIZE}"
  echo ""
  echo "  📱 Install on Android phone:"
  echo "     Option A — USB cable:"
  echo "       1. Enable Developer Options on phone:"
  echo "          Settings → About → tap 'Build number' 7 times"
  echo "       2. Enable USB Debugging in Developer Options"
  echo "       3. Connect USB cable, run:"
  echo "          adb install $(realpath $APK_DEST)"
  echo ""
  echo "     Option B — Wi-Fi transfer:"
  echo "       1. Copy Momentum.apk to your phone (WhatsApp, Google Drive,"
  echo "          USB drive, or any file sharing)"
  echo "       2. On phone: open Files app → tap Momentum.apk"
  echo "       3. Tap 'Install' (allow 'Install unknown apps' if prompted)"
  echo ""
  echo "     Option C — ADB over WiFi (phone on same network):"
  echo "       adb connect PHONE_IP:5555"
  echo "       adb install $(realpath $APK_DEST)"
  echo ""
  echo "  🔁 To rebuild after updating the app:"
  echo "     ./build-apk.sh"
  echo ""
else
  echo -e "${RED}✗ Build failed — check output above${NC}"
  exit 1
fi
