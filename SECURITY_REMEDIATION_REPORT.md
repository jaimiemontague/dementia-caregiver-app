# Help Now 1.1.0 — Security and Platform Remediation Report

Prepared July 26, 2026.

## Outcome

- Upgraded the application from Expo SDK 53 / React Native 0.79.2 to the current stable Expo SDK 57 / React Native 0.86.0 stack.
- Removed every high and critical finding in the supplied 39-advisory inventory.
- Reduced `npm audit` from 45 findings (4 critical, 19 high, 17 moderate, 5 low) to 11 moderate transitive findings (0 critical, 0 high, 0 low).
- Configured Android to compile and target Android 16 / API 36, the level Google Play requires for app updates beginning August 31, 2026.
- Bumped the public release to 1.1.0 and the local Android/iOS build values to 6. EAS remote versioning and automatic build-number increments are enabled to prevent duplicate store builds.
- Prepared the current Android toolchain for 16 KB page sizes. Final binary inspection remains an artifact-level release gate because no authenticated EAS build was available on this machine.

## Dependency remediation

The “Before” column is the clean baseline lockfile. “After” is the final clean install.

| Package family | Before | After |
|---|---|---|
| `axios` | 1.9.0 | 1.18.1 |
| `tar` | 6.2.1, 7.4.3 | Removed |
| `@xmldom/xmldom` | 0.7.13, 0.8.10 | 0.8.13, 0.9.10 |
| `node-forge` | 1.3.1 | 1.4.0 |
| `undici` | 6.21.2 | Removed |
| `minimatch` | 3.1.2, 5.1.2, 5.1.6, 9.0.5 | 3.1.5, 10.2.5 |
| `fast-uri` | 3.0.6 | Removed |
| `ws` | 6.2.3, 7.5.10, 8.18.1 | 7.5.13, 8.21.1 |
| `picomatch` | 2.3.1, 3.0.1 | 2.3.2, 4.0.5 |
| `shell-quote` | 1.8.2 | 1.10.0 |
| `jws` | 3.2.2 | Removed |
| `glob` | 6.0.4, 7.2.3, 10.4.5 | 7.2.3, 13.0.6 |

The lockfile now uses `brace-expansion` 5.0.8 throughout. Legacy `minimatch` 3 expects the older callable export, so `patch-package` applies `patches/minimatch+3.1.5.patch` after every install. A focused test proves legacy and current glob matching still work. Do not remove the `postinstall` script, override, patch, or compatibility test independently.

The final audit contains none of the GHSA/CVE identifiers listed in `Dementia_Help_Now_security_remediation_brief.md`.

## Application and backend hardening

- Preserved the Kartra form POST and headers while adding a 10-second timeout, redirect blocking, request/response size limits, and defensive membership parsing.
- Stopped returning upstream Kartra details to clients and removed logs containing partial credentials, lead records, webhook headers, and webhook bodies.
- Added mocked authentication-function tests for an active membership, missing membership, upstream failure, form encoding, headers, and transport limits.
- Removed `netlify/functions/kartra-test-lead.js`. It exposed raw CRM lead data through a deployed test endpoint and is recoverable from Git history if its diagnostic logic is ever needed locally.
- Ignored local environment files, signing files, and common Google service-account credential filenames.
- Removed unused `expo-av` and `expo-audio`, shrinking the native dependency surface.
- Updated Netlify from Node 18 to Node 22 and replaced the non-deterministic legacy-peer install with `npm ci`, matching Expo SDK 57’s runtime floor and the reviewed lockfile.

## Platform and release configuration

| Setting | Final value |
|---|---|
| Public version | 1.1.0 |
| Android package | `com.dementiasuccesspath.dementiahelpnow` |
| Android local version code | 6 |
| Android compile/target SDK | 36 / 36 |
| Android build tools | 36.0.0 |
| Android minimum SDK | 26 |
| iOS bundle identifier | `com.dementiasuccesspath.dementiahelpnow` |
| iOS local build number | 6 |
| iOS minimum deployment target | 16.4 |
| Expo / React Native | 57.0.x / 0.86.0 |
| EAS production artifact | Android App Bundle (`.aab`) |
| Store submission safety | Google internal track, draft status |

The generated Android project confirmed API 36, version 1.1.0 (6), Gradle 9.3.1, Android Gradle Plugin 8.12.0, and all four React Native ABIs. Android 16 edge-to-edge safe-area handling and the Expo Router SDK 56+ navigation import migration were applied in application code.

## 16 KB page-size evidence

- Google recommends AGP 8.5.1 or later; the generated project uses AGP 8.12.0.
- React Native 0.86 uses NDK 27.1.12297006 and enables `ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON` for React Native and Hermes.
- `react-native-reanimated` and `react-native-worklets` also enable flexible page sizes in their native builds.
- The SDK 57 EAS Android image uses JDK 17 and NDK r27b.
- `SUPPORT_16KB_PAGE_SIZE=1` remains enabled for the production build.
- The local Maven AARs inspected during prebuild contained no bundled `.so` files; native React Native/Hermes/worklets libraries are compiled during the release build.

This is strong source/toolchain evidence, but it is not a substitute for inspecting the signed artifact. After EAS produces the `.aab`, confirm `PAGE_ALIGNMENT_16K` with `bundletool`, inspect the Play Console App Bundle Explorer, and test the generated APK on a 16 KB Android emulator before production rollout. Google’s official commands and the exact release gate are in `STORE_RELEASE_GUIDE.md`.

## Verification results

All checks were run from a clean workspace with Node 22.14.0, npm 10.9.2, and lockfile version 3.

| Check | Result |
|---|---|
| Clean `npm install` / patch application | Pass |
| `npm audit --audit-level=high` | Pass; 0 high, 0 critical |
| `npx expo-doctor@latest` | Pass; 20/20 checks |
| `npm run lint` | Pass; 0 errors, 5 pre-existing hook-dependency warnings |
| `npx tsc --noEmit` | Pass |
| `npm test` | Pass; 3 suites, 5 tests, 1 snapshot |
| Web production export | Pass; 13 static routes |
| Android JavaScript/Hermes export | Pass |
| iOS JavaScript/Hermes export | Pass |
| Android clean prebuild | Pass |
| Signed Android `.aab` / iOS `.ipa` | Pending authenticated EAS build |
| Final APK ELF/ZIP 16 KB inspection | Pending Android release artifact |
| Physical Android/iPhone smoke test | Pending store test builds |

## Remaining moderate audit item

All 11 reported entries are the dependency-chain propagation of one moderate advisory: `uuid@7.0.3` inside `xcode@3.0.1`, used by Expo’s Node-based native configuration tooling. It is not application runtime code. There is no compatible parent update in the current stable Expo SDK; npm’s suggested “fix” is a downgrade to Expo 46, which would reintroduce unsupported dependencies and fail current store platform requirements. A forced override was intentionally not used because it could break native project generation. Monitor stable Expo SDK updates and remove this residual finding when the upstream `xcode` dependency updates.
