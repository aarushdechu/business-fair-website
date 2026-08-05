# Apple App Store build

Requirements: a Mac, current Xcode, Node.js, an Apple Developer Program membership, and an app record in App Store Connect.

```bash
cd mobile/app-store
npm install
npm run create
npm run open
```

In Xcode, choose your Apple development team, confirm the bundle ID `com.asketchybusiness.fair`, replace the generated AppIcon assets, test on a real iPhone, then Archive and upload to App Store Connect.

Important: this first shell shares the live website. Before review, add a privacy-policy URL and meaningful app-specific value. Because the website offers Google sign-in, review Apple guideline 4.8 and plan to add Sign in with Apple unless an exception applies. Google web sign-in also needs testing in the iOS shell; a native authentication plugin may be required.
