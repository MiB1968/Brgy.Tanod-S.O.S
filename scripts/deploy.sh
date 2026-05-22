#!/bin/bash
echo "🚀 Deploying Brgy Tanod S.O.S. for Mamburao, Occidental Mindoro..."

# Make sure scripts are executable
chmod +x ./scripts/*.sh

# Cleanup before build
if [ -f "./scripts/cleanup.sh" ]; then
  bash ./scripts/cleanup.sh
fi

echo "📦 Running build..."
npm run build

echo "☁️ Deploying to Firebase..."
# Assuming Firebase is initialized and configured
# firebase deploy --only hosting,functions,firestore:rules

echo "📱 Syncing Capacitor..."
# This assumes npx is available and project is set up for Capacitor
# npx cap sync android

echo ""
echo "✅ DEPLOYMENT PREPARATION COMPLETE!"
echo "🌐 Next: Manually run firebase deploy and cap sync if needed."
echo ""
echo "Mabuhay ang ating mga Tanod sa Mamburao! 🇵🇭🚨"
