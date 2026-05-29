# Brgy.Tanod-S.O.S - Complete Native Build & Deployment Guide

## 1. Initial Setup (One-time)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capgo/background-geolocation @capacitor/background-runner

npx cap init --web-dir dist

npx cap add android
npx cap add ios
```

## 2. Standard Development Workflow

```bash
# After any code change:
npm run build
npx cap sync

# Open native IDEs
npx cap open android
npx cap open ios
```

---

## 3. Android Build (Detailed)

### Permissions (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### Build Commands:
```bash
npx cap sync android
npx cap open android

# Debug APK
./gradlew assembleDebug

# Release Signed APK/AAB
./gradlew bundleRelease     # for AAB (Play Store)
./gradlew assembleRelease   # for APK
```

---

## 4. iOS Build (Detailed)

### Permissions (`ios/App/App/Info.plist`)
In `ios/App/App/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Kinakailangan para ma-detect ang lokasyon mo kapag may emergency SOS.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Upang makapagpadala ng SOS kahit naka-background ang application para sa Tanod Tracking.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Para magamit ang boses sa Guardian AI voice assistant.</string>
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
</array>
```

Build in Xcode → **Product → Archive**

---

## 5. Troubleshooting Common Issues

| Problem                        | Solution |
|-------------------------------|--------|
| WebLLM model not downloading  | Increase timeout in Capacitor or use Lite Mode by default |
| Location not working          | Check runtime permissions + add `ACCESS_BACKGROUND_LOCATION` |
| App crashes on low RAM        | Force Lite Mode on first launch |
| Twilio SMS not sending        | Check environment variables in native build |
| White screen after build      | Run `npx cap sync` again + clear cache |

---

## 6. Environment Variables (Firebase & Security)

Capacitor wraps your compiled web assets. Native apps **do not** read `.env` files at runtime; the variables must be baked in during the Vite build step (`npm run build`).

### 🔴 CRITICAL SECURITY WARNING 🔴
**NEVER** prefix server-side secrets (like Twilio Keys, Gemini APIs, or Postgres URLs) with `VITE_`. Any variable prefixed with `VITE_` becomes statically embedded in your native APK/AAB and can be extracted by malicious actors. 

Twilio SMS logic is strictly handled by your Express Backend or Firebase Cloud Functions, NOT the client application.

1. Only public/Firebase config values should use the `VITE_` prefix:
   ```env
   VITE_FIREBASE_API_KEY="your_firebase_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
   VITE_FIREBASE_PROJECT_ID="your_firebase_project_id"
   VITE_API_URL="https://your-production-backend.com/api"
   ```
2. Compile the web assets with these safe variables:
   ```bash
   npm run build
   npx cap sync
   ```
*(Security Note: Ensure `.env` files are tracked in `.gitignore` so backend secrets aren't pushed to version control.)*

---

## 7. App Icon & Splash Screen Setup

We use the `@capacitor/assets` tool to automatically render and assign all required resolutions for both Android and iOS from a single master source image.

1. Install the assets plugin as a development dependency:
   ```bash
   npm install -D @capacitor/assets
   ```
2. Inside the root of your project, create an `assets` directory and place your high-resolution images:
   - `assets/icon.png` (At least 1024x1024px, solid background for iOS compliance)
   - `assets/splash.png` (At least 2732x2732px, containing a centered logo with generous padding)
3. Generate the scaled native assets:
   ```bash
   npx capacitor-assets generate
   ```
4. The utility will automatically map and overwrite the default Capacitor placeholders located inside `android/app/src/main/res/` and `ios/App/App/Assets.xcassets/`.

---

### **Production Release Checklist**

- [ ] All code is using `import.meta.env` for secrets (Firebase, Twilio)
- [ ] Lite Mode is properly implemented and default for low-end devices
- [ ] WebLLM model is cached correctly
- [ ] Incident logs respect privacy (no unnecessary sensitive data stored)
- [ ] SMS fallback tested with real Philippine carriers
- [ ] Field testing completed (see `field-testing.md`)
- [ ] App icon and splash screen added
- [ ] Privacy Policy link added in app
- [ ] Signed APK/AAB ready
- [ ] TestFlight / Internal Testing done (iOS)
- [ ] Google Play Internal Test passed

**Final Release Steps:**

```bash
npm run build
npx cap sync
npx cap open android   # → Generate Signed Bundle
npx cap open ios       # → Archive in Xcode
```
