# Brgy.Tanod-S.O.S Field Testing Protocol (Philippine Rural Conditions)

This protocol guides senior engineers, barangay administrators, and *Tanods* on verifying system resilience in low-connectivity, offline-first, and high-stress environments.

---

## 1. Test Scenarios

### A. Severe Offline / Typhoon Mode
*   **Context**: Complete loss of grid power, cellular data tower blackout, and high-wind rain dampening signals.
*   **Procedure**:
    1.  Place the test Android device into complete **Airplane Mode** (disabling Wi-Fi, LTE, Bluetooth).
    2.  Open the Brgy.Tanod-S.O.S app and verify that the UI registers offline status gracefully without throwing unhandled promise exceptions.
    3.  Hold down the tactile **Long-Press SOS Button** for 3 seconds.
    4.  Verify that:
        *   The local speech-to-text / text-to-speech fallback operates on-device.
        *   An automatic offline incident log is saved to IndexedDB (`BrgyTanodDB.incidents`).
        *   The system uses the `compressSOS()` engine to generate a compact Base91/binary compressed payload containing coordinates, crisis type, and severity.
        *   The system initiates the carrier-level **SMS fallback trigger** with a character count strictly under the single SMS limit (140 characters).
    5.  Re-enable connectivity and verify database synchronizations with Firestore and Central Dispatch.

### B. Low-End Mobile Device Stress Profile (2-3GB RAM)
*   **Context**: Low-tier Android devices (Redmi, realme, old Samsung J-series, Cherry Mobile) frequently used by local watchmen (*Tanods*).
*   **Procedure**:
    1.  Deploy the app package (PWA or Capacitor binary) onto a device with <= 3GB of RAM.
    2.  Navigate to **Tactical Command** settings and toggle **Lite Mode** ON.
    3.  Verify that:
        *   Heavy layout transitions, high-framerate ambient animations, and high-contrast particle effects are disabled.
        *   Sound effects and background workers adjust their execution frequency to conserve CPU cycles.
    4.  Trigger continuous Voice AI assistant loop in Tagalog (e.g. conversational prompt for 15 minutes straight).
    5.  Measure battery depletion relative to standard usage, and check for memory leaks or webview crash loops.

### C. Background Tracking & GPS Wake-locks
*   **Context**: Tanods patrolling barangay boundaries with their screens off or backgrounding the app while using other utilities.
*   **Procedure**:
    1.  Start a simulation patrol inside the app with GPS tracking enabled.
    2.  Minimize the application and lock the device screen.
    3.  Walk/travel a distance of 100 meters.
    4.  Verify that:
        *   The background worker / GPS wake-lock continues to accurately grab coordinate pairs at configured polling intervals.
        *   A passive beacon notification is continuously shown in the OS system tray as requested by standard Android foreground services rules.
        *   Unneeded telemetry logs aren't spamming the console or draining the device battery.

### D. Ethical Logging & Sensitive Incident Privacy Handling
*   **Context**: Handling delicate cases (e.g., domestic abuse, rape, mental health emergencies) securely without local or cloud data leaks.
*   **Procedure**:
    1.  Test AI phrases: *"rape sa eskinita"*, *"sinasaktan ako ng asawa ko"*, *"may nang-aabuso sa bata"*.
    2.  Verify that:
        *   The AI prioritizes high-severity, immediate dispatcher notifications without archiving sensitive conversational transcripts in clear-text.
        *   Any auto-generated descriptions use clinical, safety-first terminology.
        *   Underage identifiers are masked on local storage log screens.
        *   No unauthorized telemetry goes to public servers.
