const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const examplePath = path.resolve(__dirname, '../fixes/firebase-applet-config.example.json');

console.log('[Config] Checking for firebase-applet-config.json...');

if (!fs.existsSync(configPath)) {
  console.log('[Config] firebase-applet-config.json not found.');
  if (fs.existsSync(examplePath)) {
    console.log('[Config] Copying from example template...');
    fs.copyFileSync(examplePath, configPath);
    console.log('[Config] ✅ Safe-mock config generated successfully.');
  } else {
    // Write dynamic fallback if the example is also somehow missing
    console.log('[Config] Creating default fallback template...');
    const fallback = {
      projectId: "",
      appId: "",
      apiKey: "",
      authDomain: "",
      firestoreDatabaseId: "(default)",
      storageBucket: "",
      messagingSenderId: "",
      measurementId: ""
    };
    fs.writeFileSync(configPath, JSON.stringify(fallback, null, 2), 'utf-8');
    console.log('[Config] ✅ Default fallback template created.');
  }
} else {
  console.log('[Config] ✅ Config file already exists.');
}
