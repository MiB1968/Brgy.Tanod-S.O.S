#!/bin/bash
echo "🧹 Starting Brgy Tanod S.O.S. Repository Cleanup..."

# Create necessary directories
mkdir -p tests/archive scripts docs public/sounds public/icons src/components/common src/hooks src/utils src/workers

# Move test/experimental files
echo "Moving test and experimental files..."
mv test*.mjs test*.cjs test*.ts check_boot* setup-onnx* reqs.txt keys.txt metadata.json 2>/dev/null || true
mv app/applet tests/archive/ 2>/dev/null || true

# Move scripts
echo "Organizing scripts..."
mv deploy.sh scripts/ 2>/dev/null || true
mv *.sh scripts/ 2>/dev/null || true

# Move documentation
echo "Organizing docs..."
mv *.md docs/ 2>/dev/null || true
mv TESTING_CHECKLIST.md docs/ 2>/dev/null || true

# Create barrel exports
echo "Creating barrel exports..."

cat > src/components/index.ts << 'EOL'
export { default as AdminCommandCenter } from './AdminCommandCenter';
export { default as AnalyticsDashboard } from './AnalyticsDashboard';
export { default as GuardianAIChat } from './GuardianAIChat';
export { default as GuardianAISettings } from './GuardianAISettings';
export { default as LiveMap } from './LiveMap';
export { default as NotificationCenter } from './NotificationCenter';
export { default as PrivacyConsentModal } from './PrivacyConsentModal';
export { default as PWAInstallPrompt } from './PWAInstallPrompt';
export { default as SOSReportForm } from './SOSReportForm';
export { default as TanodDashboard } from './TanodDashboard';
export { default as TanodPerformance } from './TanodPerformance';
export { default as TanodTrackingControls } from './TanodTrackingControls';
EOL

cat > src/services/index.ts << 'EOL'
export { tanodLocationService } from './tanodLocationService';
export { sosQueueService } from './sosQueueService';
export { guardianAI } from './guardianAI';
export { twilioFallback } from './twilioFallback';
EOL

echo "✅ Cleanup completed!"
echo "Run 'git status' to review changes."
echo "Mabuhay ang mga Tanod! 🇵🇭"
