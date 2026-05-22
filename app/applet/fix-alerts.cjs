const fs = require('fs');

const files = [
  'src/LiveMap.tsx',
  'src/components/ActiveMap.tsx',
  'src/components/BrgyTanodQR.tsx',
  'src/components/GuardianAISettings.tsx',
  'src/components/PrivacyConsentModal.tsx',
  'src/components/SOSAlertSiren.tsx',
  'src/hooks/useEmergencySystem.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf-8');
    if (code.includes('alert(')) {
      code = code.replace(/alert\(/g, 'toast(');
      
      // Ensure import toast is present
      if (!code.includes('react-hot-toast')) {
        // Insert it after the first import statement or at the top
        code = `import toast from "react-hot-toast";\n` + code;
      }
      
      fs.writeFileSync(file, code);
      console.log(`Replaced in ${file}`);
    }
  } else {
    console.warn(`File not found: ${file}`);
  }
}
