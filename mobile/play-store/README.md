# Google Play build

Requirements: Node.js, Android Studio with its current Android SDK/JDK, and a Google Play Console developer account.

```bash
cd mobile/play-store
npm install
npm run create
npm run open
```

In Android Studio, replace the generated launcher icons, test on a physical phone, create a signed Android App Bundle (`.aab`), and upload it to Play Console. Complete the Data safety, content rating, target-audience, privacy-policy, and testing sections before production release.

This shell shares the live Render website. Test Google sign-in inside the Android shell before release; if Google blocks the embedded browser flow, switch it to a native Capacitor Google authentication plugin.
