# Dementia Caregiving Made Easier (DCME App)

The DCME App helps family and professional caregivers manage challenging dementia behaviors in real-time. With just a few taps, users can access short, practical video demonstrations tailored to specific situations — even in the middle of a crisis.

Built using [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) + [Expo Router](https://expo.dev/router) for seamless cross-platform support.

---

## 📲 Platforms Supported

- iOS (via App Store or TestFlight)
- Android (via APK or Google Play Store)
- Web (hosted version for caregivers who don’t want to install the app)

---

## 🚀 Features

- 🧠 **Behavior List** – Choose from common dementia behaviors (e.g. *Sundowning*, *Anger*, *I Want to Go Home!*)
- 📋 **Situation List** – Quickly select the exact situation you're facing
- 🎥 **Video Guidance** – Watch a <30-second video with the right phrase, tone, and body language
- 🔍 **Search & Suggestions** – Find help instantly with predictive behavior/situation search
- 📞 **Help Now Page** – One-tap access to Krista and emergency coaching info
- 🔙 **In-App Navigation** – Always-visible back button for intuitive UX

---

## 🛠️ Tech Stack

| Area            | Tool                          |
|-----------------|-------------------------------|
| Framework       | React Native + Expo           |
| Routing         | Expo Router (File-based)      |
| State Handling  | React Hooks                   |
| Video Hosting   | Amazon S3                     |
| Mobile Builds   | Expo EAS                      |
| Web Hosting     | Amazon S3 and Cloudflare      |
| Package Manager | npm                           |
| Type Checking   | TypeScript                    |

---

## 🧪 Getting Started (Dev)

> You’ll need `node`, `npm` and `expo-cli` installed.

```bash
git clone https://github.com/your-org/dcme-app.git
cd dcme-app
npm install
npx expo start
