# Help Now 1.1.0 — Store Release Guide

This guide assumes the existing App Store and Play Store records use:

- iOS bundle ID: `com.dementiasuccesspath.dementiahelpnow`
- Android package: `com.dementiasuccesspath.dementiahelpnow`
- New customer-facing version: 1.1.0

Do not create new store app records. An update must use the existing records, identifiers, and signing credentials.

## 1. One-time account check

### Expo

Open PowerShell in this application folder and run:

```powershell
npx eas-cli@latest login
npx eas-cli@latest whoami
```

Use the Expo account that owns the `jcmont6` project. EAS can build and submit both platforms from Windows.

### Apple

1. Sign in at [Apple Developer](https://developer.apple.com/account/) with the Apple Account that owns the app.
2. Open Membership details. If the membership expired, select **Renew Membership**. Apple says free apps normally return to availability within 24 hours after a late renewal.
3. Sign in at [App Store Connect](https://appstoreconnect.apple.com/).
4. Clear every banner requesting a new agreement, tax/business detail, or compliance response. The Account Holder may be required.
5. Open **Apps → Help Now → App Information**:
   - Confirm the bundle ID shown above.
   - Complete the updated age-rating questions. Apple required the new questions by January 31, 2026.
   - Note the numeric **Apple ID**. This is the `ascAppId` if EAS asks for it.
6. Open **App Privacy**. Confirm the privacy-policy URL works and the answers reflect the current login flow and third-party services. The app sends an email address to Kartra to verify membership; make sure the declarations accurately cover that handling.

Apple’s current upload rule requires Xcode 26+ and the iOS 26 SDK. Expo SDK 57’s automatic EAS image is Xcode 26.6, so leave the EAS iOS image on its automatic SDK-matched setting.

### Google

1. Sign in at [Google Play Console](https://play.google.com/console/).
2. Open **All apps → Help Now** and confirm its package name is the one above.
3. On the Dashboard, clear blocking items under **Policy status**, **App content**, and account verification.
4. Open **Test and release → Latest releases and bundles** (or **App bundle explorer**) and write down the highest existing `versionCode`.
5. Check **Setup → App signing** and confirm Play App Signing is still active. Do not create or switch signing keys during this update.
6. Review **Policy and programs → App content → Data safety**. Make sure email/authentication and Kartra/Netlify handling are declared accurately and the privacy-policy link works.

Google requires updates submitted from August 31, 2026 onward to target API 36. This project already targets 36.

## 2. Sync build numbers before building

The project uses EAS remote versioning and automatically increments store build numbers. Sync it to the stores before the first build so EAS cannot accidentally reuse or skip from a stale number:

```powershell
npx eas-cli@latest build:version:set
```

Run the command once for Android and once for iOS.

- For Android, enter the highest `versionCode` currently in Play Console—not the next number.
- For iOS, enter the highest build number already uploaded for version 1.1.0, or the last uploaded build number if 1.1.0 has no builds.
- The next production build will increment that stored value automatically.

The local files show build 6, based on the previous code’s build 5. The store values are authoritative; use what each console actually shows.

## 3. Reproduce the local checks

Run each command and stop if any one fails:

```powershell
npm ci
npm audit --audit-level=high
npx expo-doctor@latest
npm run lint
npx tsc --noEmit
npm test
npx expo export --platform android --output-dir dist-android
npx expo export --platform ios --output-dir dist-ios
```

`npm audit` will still display the documented moderate Expo build-tool advisory. It must show 0 high and 0 critical. Lint may show the five documented hook warnings, but must show 0 errors.

Before building, verify the live Netlify site still has `KARTRA_API_KEY` and `KARTRA_API_PASSWORD` configured and deploy the updated functions. If Netlify is connected to the Git repository, pushing the reviewed commit to its production branch should run the configured Node 22 build. Otherwise:

```powershell
npx netlify-cli@latest login
npx netlify-cli@latest link
npx netlify-cli@latest deploy
npx netlify-cli@latest deploy --prod
```

Use the non-production deploy URL first. Confirm the linked production site is `dementia-help-now.netlify.app` before running `--prod`; that is the hostname embedded in the mobile login screen. After deployment, test one known active member login and one known inactive/nonmember login. Do not continue to the store builds if authentication fails.

## 4. Build both store artifacts

Start Android first:

```powershell
npx eas-cli@latest build --platform android --profile production
```

Then build iOS:

```powershell
npx eas-cli@latest build --platform ios --profile production
```

On the first build, let EAS reuse the existing Android keystore and Apple distribution credentials. If EAS says no credentials exist, stop and inspect the existing store signing setup before generating replacements. An Android update must be signed by the expected upload key.

Download both artifacts or save their EAS build-page links. Record the actual version/build numbers from the EAS build details.

## 5. Android artifact gate and internal test

### Verify before upload

The Play Console is the easiest check:

1. Upload to the internal track using the command below.
2. Open **App bundle explorer** for the new bundle.
3. Confirm `targetSdkVersion` 36.
4. Confirm Google reports 16 KB page-size compatibility and no native-library alignment warning.
5. Check the automated pre-review and pre-launch reports.

Optional local bundle check, if Android `bundletool` is installed:

```powershell
java -jar .\bundletool-all.jar dump config --bundle .\application.aab
```

The output must contain `PAGE_ALIGNMENT_16K`, not `PAGE_ALIGNMENT_4K`. For a generated APK, Google’s official ZIP check is:

```powershell
& "$env:ANDROID_HOME\build-tools\36.0.0\zipalign.exe" -v -c -P 16 4 .\application.apk
```

Every native `.so` load segment must also be at least `2**14`. Android Studio’s **Build → Analyze APK** shows alignment warnings, and a 16 KB Android emulator is the final runtime test.

### Upload safely

The production submission profile is intentionally configured for the **internal** track with **draft** status:

```powershell
npx eas-cli@latest submit --platform android --profile production --latest
```

In Play Console:

1. Go to **Testing → Internal testing**.
2. Open the draft release, add release notes, and review the new app bundle.
3. Add tester email addresses or a Google Group.
4. Select **Start rollout to Internal testing**.
5. Open the tester opt-in link on a physical Android device and install the update.

Test:

- active and inactive Kartra login;
- logout and 30-day session restoration;
- Home, Help Now, Explore, behavior details, favorites, and recently viewed;
- video thumbnails, playback, and fullscreen;
- dark/light mode, portrait layout, system back behavior, and edge-to-edge insets;
- an Android 15/16 device and, if available, a 16 KB emulator.

Do not promote the release if Play Console shows an API, signing, 16 KB, policy, crash, or pre-launch warning.

### Production rollout

After internal testing passes:

1. Go to **Production → Create new release**.
2. Promote the tested internal release or select the same approved bundle from the library.
3. Add concise release notes, for example: “Updated for the latest Android and iOS platform requirements, with security, stability, and video playback improvements.”
4. Review every warning and select **Start rollout to Production**.
5. Use a staged rollout (for example 10%) if the console offers it. Watch Android vitals, crashes, ANRs, login failures, and reviews for at least a day before increasing to 100%.

Google requires an update to keep the same package, use a higher version code, and be signed with the expected key. The current EAS configuration handles the first two after version sync; the credential prompt confirms the third.

## 6. iOS upload, TestFlight, and App Review

Upload the newest EAS iOS build:

```powershell
npx eas-cli@latest submit --platform ios --profile production --latest
```

EAS will ask for the Apple team/app when needed. Submission only uploads the build; it does not release it.

In App Store Connect:

1. Open **Apps → Help Now → TestFlight** and wait for processing. Apple usually emails when processing completes.
2. Answer the export-compliance question. `ITSAppUsesNonExemptEncryption` is set to `false`; confirm that remains truthful for the app.
3. Add the build to an internal TestFlight group and install it on at least one real iPhone.
4. Repeat the login, navigation, favorites, video, fullscreen, rotation/portrait, and session-restoration tests.
5. Under the **App Store** tab, create or open iOS version **1.1.0**.
6. Add **What’s New**, verify screenshots/store text, select the processed build, and complete all required fields.
7. Under **App Review Information**, provide a reliable review contact and valid reviewer login credentials. Because the app is gated by Kartra membership, explain the login steps and make sure the review account remains active through review.
8. Choose a release method. **Manually release this version** gives the most control; Apple’s phased release is also reasonable after approval.
9. Select **Add for Review**, review the draft submission, and then **Submit for Review**.

After approval, release manually when you are ready. Watch crashes, sign-in support requests, and reviews before completing the Google staged rollout if the two releases overlap.

## 7. If a prompt looks wrong

Stop rather than replacing signing credentials, creating a new app record, changing either package identifier, or uploading directly to production. Save a screenshot of the prompt and the EAS build URL. The safe recovery points are the Android internal draft and the iOS TestFlight build; neither affects current store users.

## Official references

- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Android 16 KB page-size support and verification](https://developer.android.com/guide/practices/page-sizes)
- [Google Play app-update requirements](https://support.google.com/googleplay/android-developer/answer/9859350)
- [Google Play internal testing](https://support.google.com/googleplay/android-developer/answer/9845334)
- [EAS Android submission](https://docs.expo.dev/submit/android/)
- [EAS iOS submission](https://docs.expo.dev/submit/ios/)
- [EAS remote app-version management](https://docs.expo.dev/build-reference/app-versions/)
- [Apple Developer membership renewal](https://developer.apple.com/help/account/membership/renewal)
- [Apple’s current SDK upload requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- [Apple app privacy management](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Submit an app to App Review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
