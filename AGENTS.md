# Dementia Help Now — AI Agent Orientation & Implementation Guide

> **Note for AI Agents**: This file maps out the Dementia Help Now codebase and provides precise, actionable instructions for completing the security vulnerability remediation, Google Play target API upgrade, and 16 KB page-size compliance update.

---

## 1. Codebase Architecture & Directory Map

### High-Level Tech Stack
- **Framework**: React Native (`0.79.2`) with Expo SDK (`~53.0.0`) and Expo Router (`~5.0.7`).
- **Language**: TypeScript (`tsconfig.json`) & JavaScript.
- **Backend / Authentication**: Netlify Serverless Functions (`netlify/functions/`) integrating with Kartra CRM API. User auth state is managed via `contexts/AuthContext.tsx` with 30-day token persistence in `@react-native-async-storage/async-storage`.
- **Build System**: Expo Application Services (EAS Build) configured in `eas.json` for Android App Bundle (`.aab`) production releases.
- **Package Manager**: `npm` with lockfile `package-lock.json`.

### Workspace Layout Map
```
c:/Users/Jaimie Montague/OneDrive/DCME/AI and Automation/Dementia Help Now App/
├── AGENTS.md                                        # Workspace root agent guide
├── Dementia_Help_Now_security_remediation_brief.md  # Detailed security advisory inventory (39 GHSA/CVEs)
└── dementia-caregiver-app/                           # Main React Native / Expo application folder
    ├── AGENTS.md                                    # App-level agent map and guide
    ├── app/                                         # Expo Router file-based pages
    │   ├── _layout.tsx                              # Root layout with AuthProvider & AuthWrapper
    │   ├── login.tsx                                # User authentication screen (fetches Kartra Netlify function)
    │   ├── +not-found.tsx                           # Fallback 404 page
    │   └── (tabs)/                                  # Main tab navigation screens
    │       ├── _layout.tsx                          # Bottom tab bar layout
    │       ├── index.tsx                            # Home tab screen
    │       ├── help-now.tsx                         # Quick help tab screen
    │       ├── explore.tsx                          # Search & explore tab screen
    │       └── behavior/                            # Caregiver behavior guide screens
    ├── assets/                                      # Images, fonts, and icons
    ├── components/                                  # Reusable UI components
    │   ├── AuthWrapper.tsx                          # Enforces authentication state route protection
    │   ├── BehaviorCard.tsx                         # Cards for behavior situations
    │   ├── FavoriteCard.tsx                         # Favorite item display
    │   ├── HorizontalScrollSection.tsx              # Carousel UI components
    │   ├── VideoThumbnail.tsx                       # Video card thumbnails using expo-video
    │   └── __tests__/                               # Component Jest test files
    ├── constants/                                   # Color palettes & layout constants
    ├── contexts/                                    # React Context providers
    │   └── AuthContext.tsx                          # Session lifecycle & AsyncStorage persistence
    ├── data/                                        # Content data
    │   └── videoData.json                           # Video shortcode & URL metadata
    ├── hooks/                                       # Custom React hooks (e.g. useColorScheme, useThemeColor)
    ├── netlify/                                     # Serverless backend functions
    │   └── functions/
    │       ├── kartra-auth.js                       # Kartra CRM lead verification API endpoint (uses axios)
    │       ├── kartra-test-lead.js                  # Kartra API connection test script
    │       └── kartra-webhook.js                    # Webhook receiver for Kartra updates
    ├── app.json                                     # Expo configuration (API targets, package name, versioning)
    ├── eas.json                                     # EAS Build profile configurations
    ├── netlify.toml                                 # Netlify function build settings
    ├── package.json                                 # Dependency specifications & npm scripts
    ├── package-lock.json                            # Dependency lockfile (must be preserved/updated)
    └── tsconfig.json                                # TypeScript compiler configuration
```

---

## 2. Current Baseline & Environment Diagnostics

### Package & Audit Baseline
- **Total Dependencies**: 1,263 packages (1,096 prod, 146 dev, 22 optional).
- **Vulnerability Status**: 45 total npm audit findings (4 critical, 19 high, 17 moderate, 5 low).
- **Affected Core Packages**: 12 main package families requiring remediation:
  1. `axios` (9 advisories, up to **Critical**) — used in Netlify functions (`kartra-auth.js`) and app.
  2. `tar` (6 advisories, High)
  3. `@xmldom/xmldom` (5 advisories, High)
  4. `node-forge` (5 advisories, High)
  5. `undici` (4 advisories, High)
  6. `minimatch` (3 advisories, High)
  7. `fast-uri` (2 advisories, High)
  8. `ws` (1 advisory, High)
  9. `picomatch` (1 advisory, High)
  10. `shell-quote` (1 advisory, High)
  11. `jws` (1 advisory, High)
  12. `glob` (1 advisory, High)

### Build & Test Baseline Findings
- **Jest Test Suite**: Running `npm test -- --watchAll=false` currently encounters a baseline configuration error in the `jest-expo` preset:
  `TypeError: Object.defineProperty called on non-object` at `node-forge` / `jest-expo/src/preset/setup.js`.
  *Note for future agents*: Do not attribute this existing Jest preset issue to security updates. Document it separately or update `jest-expo` / Jest setup configuration during testing.
- **Android Target SDK**: `app.json` has `compileSdkVersion: 35` and `targetSdkVersion: 35` configured.
- **16 KB Memory Page Size Support**: `eas.json` includes `"SUPPORT_16KB_PAGE_SIZE": "1"` under production environment settings.

---

## 3. Step-by-Step Instructions for the Remediation Agent

When implementing the fixes specified in `Dementia_Help_Now_security_remediation_brief.md`, follow this exact execution sequence:

### Phase 1: Establish Clean Baseline
1. Working Directory: Change to `c:/Users/Jaimie Montague/OneDrive/DCME/AI and Automation/Dementia Help Now App/dementia-caregiver-app`.
2. Record initial `npm audit --json` output.
3. Confirm Node.js, npm, and Expo CLI versions.
4. Verify existing lockfile format is preserved.

### Phase 2: Remediate All 39 Security Advisories
1. Cross-reference the 39 unique GHSA/CVE entries in `Dementia_Help_Now_security_remediation_brief.md` against `npm audit`.
2. Inspect package dependency trees using `npm explain <package-name>`.
3. Upgrade direct dependencies in `package.json` first (e.g. `axios`, `ws`, `eas-cli`).
4. For transitive dependencies (`undici`, `@xmldom/xmldom`, `node-forge`, `tar`, `minimatch`, `fast-uri`, `picomatch`, `shell-quote`, `jws`, `glob`):
   - Upgrade owning parent packages where available.
   - If no parent package update is available, specify `overrides` in `package.json` with safe resolved versions.
5. Re-run `npm install` to update `package-lock.json`.
6. Confirm zero high or critical vulnerability findings remain in `npm audit`.

### Phase 3: Re-Test Risk-Sensitive Behavior
1. Test authentication flows in `app/login.tsx` and Netlify function `netlify/functions/kartra-auth.js` to ensure `axios` upgrades preserve HTTP header and POST request handling.
2. Resolve the `jest-expo` setup baseline error if necessary and run unit/component tests (`npm test`).
3. Add focused test coverage for any customized data/network utility logic.

### Phase 4: Satisfy Google Play Target API Requirement (Android 15 / API 35+)
1. Verify `compileSdkVersion: 35` and `targetSdkVersion: 35` in `app.json`.
2. Ensure Expo plugins and prebuild settings generate compliant Android manifests and `build.gradle` settings targeting API Level 35 or higher.
3. Verify runtime compatibility with Android 15 permissions, background execution, notifications, and edge-to-edge layouts.

### Phase 5: Satisfy 16 KB Page-Size Requirement
1. Confirm `SUPPORT_16KB_PAGE_SIZE: "1"` flag in `eas.json`.
2. Inspect prebuilt native `.so` libraries bundled by Expo / React Native packages (such as `react-native`, `expo-video`, `expo-av`, `react-native-reanimated`).
3. Ensure native binaries are compiled and aligned to 16 KB boundary rules per Android 15 / NDK r27+ guidelines.
4. Verify release AAB/APK alignment using Android SDK `zipalign` or `readelf` tooling.

### Phase 6: Document & Provide Verification Evidence
Prepare the final summary report with:
- Before/after package version map for all 12 package families.
- Output from `npm audit` confirming 0 high/critical vulnerabilities.
- Verification results for Android build, target API level 35 declaration, and 16 KB page-size compliance.

---

## State as of October 8, 2026 (read this before the sections above)

The sections above describe the July 2026 baseline. Since then:

- The July remediation (Expo SDK 57, hardened `kartra-auth.js`, Node 22, API 36) is committed on branch `sdk57-security-remediation`, with a second patch pass on October 8: every Expo package on SDK 57's current patch, axios 1.20.0, overrides in `package.json`. Four advisories have no published fix and are listed with reasons in `audit-allowlist.json`; **`npm run audit:gate` is the release gate**, not the raw `npm audit` count. `STORE_RELEASE_GUIDE.md` and `SECURITY_REMEDIATION_REPORT.md` describe both passes.
- Branch `free-tier` (on top of it) adds access tiers: `netlify/functions/kartra-auth.js` returns `tier` ("member" for any active Kartra membership, "free" for any Kartra lead or any contact in the Mailchimp audience in any status), records free logins in Mailchimp (date fields from `APP_FIRST_LOGIN_FIELD` / `APP_LAST_LOGIN_FIELD`, tags `app user` / `app returned`) and every login in Netlify Blobs (`@netlify/blobs`, best effort). The app stores the tier in `contexts/AuthContext.tsx` (`isMember`), hides the Help Now link and screen from free users, and the login copy no longer says members only. The function needs `MAILCHIMP_API_KEY` in Netlify's environment.
- Neither branch is merged or deployed. GitHub's Dependabot alerts on `main` refer to the October 2025 lockfile and go away when `sdk57-security-remediation` merges.
- The product direction (free app for Facebook leads, member layer of about 100 more Reels plus cheat sheets, search keywords per situation) is in the vault: `Documents\Jaimie and DSP\outputs\dsp\2026-10-07-dhn-app-facebook-campaign-plan.md` and `2026-10-07-dhn-app-upgrade-plan.md`.
- Git on this OneDrive folder: if `git checkout` fails with "unable to append to '.git/logs/HEAD'", run `git config core.logAllRefUpdates false` (the webhook repo needed it; this one did not).
