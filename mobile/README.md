# Mobile store builds

The website remains the single source of truth. The two folders here are small native Capacitor shells that open the deployed, phone-first storefront at `https://a-sketchy-business.onrender.com`.

- `app-store/` creates the iPhone/iPad Xcode project.
- `play-store/` creates the Android Studio project.

This avoids maintaining three separate storefronts. Deploy website changes to Render, and both installed apps receive the updated experience.

Before submitting either app, add store-quality icons/screenshots, a support page, and a privacy-policy URL. Apple may also require Sign in with Apple when Google sign-in is offered; see the App Store guide.

For a no-store option, the site is also a PWA: visitors can use **Add to Home Screen** in Safari or Chrome immediately.
