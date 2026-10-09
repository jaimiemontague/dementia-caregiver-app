# Help Now Plus: setup

Help Now Plus is a one-time, non-consumable in-app purchase that unlocks the member layer (videos marked `tier: "member"` in `data/videoData.json`) and every cheat sheet. Members get it included; the Help Now screen (writing to Krista) stays members-only. It is sold only through the App Store and Google Play purchase sheet, through RevenueCat. Five products test the price: $7, $17, $27, $37 and $47 ($7 and $17 added by Jaimie, October 9, 2026).

The code is done on branch `member-layer` (October 9, 2026). Nothing below has been set up yet: no store products, no RevenueCat account, no keys. Until the keys exist, the paywall says purchases aren't available.

## 1. What has to happen, in order

1. Krista's one-sentence promise replaces `[PLUS PROMISE]` in `constants/plusCopy.ts`, and Jaimie approves the strings in section 10.
2. Agreements and payments in both stores (section 2 and 3).
3. RevenueCat project, products and the `plus` entitlement (section 4).
4. Keys into EAS (section 5).
5. A development build and the sandbox test plan (sections 6 and 7).
6. The store release, with the first in-app purchases submitted together with the app version (sections 2 and 9).

## 2. App Store Connect

1. **Business > Agreements, Tax and Banking**: the Paid Apps Agreement must be active, with bank and tax details. Without it, products can't be tested or sold.
2. **Apps > Help Now > Monetization > In-App Purchases > +**, five times:

   | Type | Reference name | Product ID | Price (base country United States) |
   | --- | --- | --- | --- |
   | Non-Consumable | Help Now Plus 7 | `help_now_plus_7` | USD 7.00 |
   | Non-Consumable | Help Now Plus 17 | `help_now_plus_17` | USD 17.00 |
   | Non-Consumable | Help Now Plus 27 | `help_now_plus_27` | USD 27.00 |
   | Non-Consumable | Help Now Plus 37 | `help_now_plus_37` | USD 37.00 |
   | Non-Consumable | Help Now Plus 47 | `help_now_plus_47` | USD 47.00 |

   For each: availability in every country the app is in; App Store localization (English US) display name `Help Now Plus`, description `The extra situation videos and printable cheat sheets` (descriptions are limited to 55 characters); a review screenshot of the paywall from the development build. If a price point isn't offered exactly, take the nearest and note it.
3. **First in-app purchases go to review with an app version.** On the 1.x version page, add the five products under "In-App Purchases and Subscriptions" before Submit for Review.
4. **Users and Access > Integrations > In-App Purchase**: generate a key and download the .p8 (it downloads once). Note the Key ID and the Issuer ID. RevenueCat needs them (section 4).
5. **Users and Access > Sandbox > Testers > +**: one tester per person testing, each with an email that has never been an Apple Account.
6. **App Privacy**: purchases are now collected through RevenueCat. Review the declarations for Purchase History and add RevenueCat to the privacy policy's list of processors. The RevenueCat user id is a 12-character hash of the login email.
7. **App Review Information**: give a free-tier demo login (an email in Mailchimp or Kartra with no membership and no `App Plus` tag). A member login never sees Plus. Say where Plus is: the "Help Now Plus" row on Home, or "Get Plus" on any cheat sheet card. Say why a login comes first: the whole app works by the email the caregiver signed up with, and Plus is tied to that login so it follows them to any phone (Apple has questioned purchases that need an account first, guideline 5.1.1(v)). Mention nothing else about how Plus is sold.
8. **The Privacy Policy link** opens the policy on dementiasuccesspath.com, the page the store listings use. That site's header has the cart and the member login. If App Review objects under 3.1.1, publish a bare policy page with no site navigation and point `PLUS_LINKS.privacy` in `constants/plusCopy.ts` at it.

## 3. Google Play Console

1. **Settings > Payments profile**: a merchant account must be linked to sell anything.
2. **Upload a build that contains the purchases module first.** Play only lets you create in-app products once the app has a bundle with the billing permission (react-native-purchases adds it). A production build submitted with `npx eas-cli@latest submit --platform android --profile production --latest` lands on the internal track as a draft; roll it out to internal testing if Play still asks for a billing build.
3. **Monetize with Play > Products > One-time products > Create** ("In-app products" in older menus), five times: product ID `help_now_plus_7` / `help_now_plus_17` / `help_now_plus_27` / `help_now_plus_37` / `help_now_plus_47` (IDs can never be changed or reused), name `Help Now Plus`, description `The extra situation videos and the printable cheat sheets.`, price USD 7.00 / 17.00 / 27.00 / 37.00 / 47.00, then **Activate**.
4. **Settings > License testing**: add the Google accounts that will test. Their purchases are not charged. Testers also join the internal test track (Testing > Internal testing > Testers) and install once from the opt-in link. If a development build doesn't see the products, install the internal-testing build from the Play Store instead.
5. **Service account for RevenueCat**: follow RevenueCat's "Google Play service credentials" guide (a Google Cloud service account, invited in Play Console > Users and permissions with financial and order access, JSON key uploaded to RevenueCat). New credentials can take a day or more to start working.
6. **Policy > App content > Data safety**: add purchase history, as for Apple.

## 4. RevenueCat

1. Create the account and a project "Help Now". Check their current pricing page; it has been free up to a monthly revenue threshold.
2. Add two apps: **App Store** (bundle ID `com.dementiasuccesspath.dementiahelpnow`, upload the In-App Purchase key from 2.4) and **Play Store** (package `com.dementiasuccesspath.dementiahelpnow`, upload the service-account JSON from 3.5).
3. **Products**: add (or import) the five product IDs for each store, ten products in all.
4. **Entitlements**: create one entitlement with the identifier `plus`, exactly, and attach all ten products. This is the step that matters most: a product not attached to `plus` takes the money and unlocks nothing (the paywall then says "Something went wrong").
5. **Offerings**: the app doesn't use them (it picks the product from the price test), but RevenueCat complains in the logs when there are none. Optional: a `default` offering with five custom packages, one per product.
6. **Project settings > Restore behavior**: keep the default, "Transfer to new App User ID". Restore purchases on another login email then moves Plus to that email.
7. **API keys**: Project settings > API keys. The two public app-specific keys (App Store, starting `appl_`; Play Store, starting `goog_`) are the only keys the app uses. They go to EAS (section 5), never into the repo. The secret key is not used.
8. **Finding a customer**: customers are named by the emailHash. `npm run plus:report -- --hash someone@example.com` prints it. Each customer carries the attributes `plus_price_test` and `plus_price_product`, so RevenueCat's charts can be split by price.

## 5. Environment variables

**EAS (the builds).** From this folder, once per environment the builds use:

```powershell
npx eas-cli@latest env:set --environment development --name REVENUECAT_IOS_KEY --value appl_XXXX --visibility sensitive
npx eas-cli@latest env:set --environment development --name REVENUECAT_ANDROID_KEY --value goog_XXXX --visibility sensitive
```

Repeat with `--environment production` (and `preview` if that profile is used). Use `sensitive`, not `secret`: `app.config.js` reads the keys, and EAS only hands `secret` values to its build servers, not to the config check `eas build` runs on this PC. (These are public SDK keys, shipped inside the app; `sensitive` keeps them out of logs.) A build without them prints a "[Help Now Plus]" warning and its paywall says purchases aren't available.

**Local, for `npx expo start --dev-client`:** a `.env` file in this folder (git ignores it) with the same two lines:

```
REVENUECAT_IOS_KEY=appl_XXXX
REVENUECAT_ANDROID_KEY=goog_XXXX
```

**Netlify.** Nothing new is required: `plus-events` uses Netlify Blobs (store `app-plus`) the same way the login log does, and deploys with the site. Optional: `KARTRA_PLUS_TAG` and `MAILCHIMP_PLUS_TAG` if the web-purchase tag is ever named something other than `App Plus` (matched ignoring case). For the report only, on the PC that runs it: `NETLIFY_SITE_ID` (Site configuration > Site details) and `NETLIFY_AUTH_TOKEN` (User settings > Applications > Personal access tokens).

The login function change is safe to deploy before the app: builds from before Plus get "free" for a tagged buyer, because they would read any other tier as a member.

## 6. Development build (purchases can't be tested in Expo Go)

Expo Go and the web app don't contain the store module, so the paywall shows "Preview only: purchases work in the installed app." Testing a purchase needs a development build, which carries the module and still reloads code from the PC like Expo Go:

```powershell
npx eas-cli@latest device:create                                   # once per iPhone: registers it for internal builds
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android  # an APK to install directly
npx expo start --dev-client                                        # then open the project from the development build
```

On the iPhone: Settings > Privacy & Security > Developer Mode on, then Settings > Developer > Sandbox Apple Account, signed in with a sandbox tester from 2.5.

## 7. Sandbox test plan

1. Log in with a free email. Home shows the "Help Now Plus" row; a video with a cheat sheet shows the locked card with "Get Plus".
2. Open the paywall. The price shows in the store's format; `npm run plus:report` (or the RevenueCat customer's attributes) shows which product this email got.
3. Buy. "Thank you! Plus is unlocked."; cheat sheets open; the Plus row and badges are gone.
4. Log out and back in: still Plus. Delete the app, reinstall, log in with the same email: Plus comes back without a purchase. Try Restore purchases too.
5. The other platform (or another phone), same email: Plus.
6. Another free email on the same phone. Expected: no Plus until Restore purchases, which moves the purchase to that email (section 4.6). Check it on both platforms: this is the case support questions will come from.
7. A member login: no Plus row, no badges, Help Now present.
8. Web purchase path: tag a test contact `App Plus` in Mailchimp or Kartra and log in. Plus without buying; Help Now still hidden.
9. A refund (Play Console > Order management, on a test order): at the next app start or login, store-bought Plus goes away. Plus from the tag never does.
10. Ask to Buy or a slow card: the paywall says the purchase is waiting for approval; Plus unlocks when the store approves it, while the app is open.

## 8. Reading the price test

- Each caregiver gets one product from the hash of their login email, the same on every phone and in every session. `PRICE_TEST_ID` in `utils/priceTest.ts` names the test; changing it starts a new one.
- One exception, to protect buyers: once a phone has bought or restored Plus, the next email that logs in on that phone is offered the same product. Each price is a separate store product, and a store only refuses to charge twice for the same product; this way the store says "already purchased" and hands it over instead. The report notes these as purchases of a product other than the one assigned.
- The app records the assignment the first time it shows the caregiver their price, and every purchase. "Saw price" in the report is therefore the caregivers who were actually offered that price.
- `npm run plus:report` prints, per product: saw price, buyers, conversion, purchases by platform, gross at list price. `--json` gives the same as JSON. A store transaction recorded under two emails counts once.
- The report checks every record against the login log (`users/<emailHash>` in the Netlify Blobs store `app-logins`, written by the login function). Records that match no login are counted in a note; `--matched-only` leaves them out. Use it if the numbers ever look inflated: plus-events is an open endpoint.
- Judge the prices by revenue per caregiver who saw the price (conversion times price), not by conversion alone.
- Small numbers mislead. At the usual thresholds (95% confidence, 80% power), telling 3% conversion from 2% takes about 3,800 caregivers per price, so with five prices about 19,000 caregivers who reach the paywall (three prices needed about 11,400). Before that, treat differences as direction only.
- RevenueCat has the money actually paid (local prices, store fees, refunds). The Blobs log is for reading the test, and it is an open endpoint, so it could be polluted; cross-check buyers against RevenueCat.
- Web purchases through the email funnel are not in this test.
- To end it: keep the winning product only (`PLUS_PRODUCTS` in `utils/priceTest.ts`), and leave the other two active in the stores so earlier buyers keep restoring.
- Heads-up: both store pages list in-app purchases with prices, so a careful shopper can see all five, the $7 one included, while being offered another.

## 9. Before the store release

- [ ] `[PLUS PROMISE]` replaced; every string in section 10 approved (Krista for anything that promises something). A production EAS build stops with "Replace [PLUS PROMISE] in constants/plusCopy.ts" until it is (`app.config.js`).
- [ ] Keys in the EAS `production` environment.
- [ ] Six products live and attached to `plus` in RevenueCat; App Store products added to the app version.
- [ ] Section 7 passed on an iPhone and an Android phone.
- [ ] App Privacy, Data safety and the privacy policy updated for purchases.
- [ ] App Review notes and a free demo login (2.7).
- [ ] The rule for Plus buyers who later join the membership (still open).
- [ ] The usual `STORE_RELEASE_GUIDE.md` checks; `npx expo-doctor@latest` passed on October 9 with the new packages.

## 10. Every user-facing string Plus adds

All of them live in `constants/plusCopy.ts`. `constants/__tests__/plusCopy.test.ts` fails if any of them, or any text the paywall renders in any state, contains web, site, online, http, www, .com, membership, cheaper, elsewhere, discount, coupon, Kartra, Mailchimp, Facebook, "email us", or the word member(s).

| Key | Text | Where |
| --- | --- | --- |
| `name` | Help Now Plus | Paywall title |
| `promise` | [PLUS PROMISE] | Paywall, under the title (Krista's sentence, pending) |
| `includes` | Plus adds the extra situation videos and the printable cheat sheets. | Paywall; locked video page |
| `buyButton` | Get Plus for [PRICE] | Paywall button; [PRICE] is the store's price string |
| `oneTime` | One-time purchase. No subscription. | Paywall |
| `chargedIos` | Payment is charged to your Apple Account when you confirm the purchase. | Paywall, iPhone |
| `chargedAndroid` | Payment is charged to your Google Play account when you confirm the purchase. | Paywall, Android |
| `restore` | Restore purchases | Paywall link |
| `terms` | Terms of Use | Paywall footer, iPhone only (Apple's standard license agreement) |
| `privacy` | Privacy Policy | Paywall footer (dementiasuccesspath.com/privacy-policy) |
| `close` | Close | Paywall close button (screen reader label) |
| `loadingPrice` | Getting the price… | Paywall while the store answers |
| `priceFailed` | The price didn't load. Check your connection and try again. | Paywall |
| `retry` | Try again | Paywall |
| `preview` | Preview only: purchases work in the installed app. | Paywall in Expo Go and on the web |
| `unavailable` | Purchases aren't available right now. Please try again later. | Paywall in a build without keys |
| `owned` | You have Help Now Plus | Paywall for Plus buyers and members |
| `ownedDetail` | The extra situation videos and the printable cheat sheets are unlocked. | Same |
| `purchased` | Thank you! Plus is unlocked. | After a purchase |
| `restored` | Your purchase is restored. Plus is unlocked. | After a restore |
| `nothingToRestore` | No Plus purchase was found to restore. | After an empty restore |
| `startWatching` | Start watching | Button after a purchase or restore |
| `pending` | Your purchase is waiting for approval. Plus unlocks as soon as it goes through. | Ask to Buy, pending payment |
| `notAllowed` | Purchases are turned off on this device. | Purchases restricted on the phone |
| `network` | We couldn't reach the store. Check your connection and try again. | Store unreachable |
| `failed` | Something went wrong. Please try again. | Any other failure |
| `badge` | Plus | Badge on Plus videos, shelves and search results |
| `badgeLabel` | Included with Plus | The badge, for screen readers |
| `cheatsheetLabel` | Printable cheat sheet for this situation | Locked cheat sheet card |
| `cheatsheetLocked` | Included with Help Now Plus. | Locked cheat sheet card |
| `getPlus` | Get Plus | Locked cheat sheet card; locked video page |
| `lockedVideoTitle` | This video is part of Help Now Plus | Locked video page |
| `homeRowTitle` | Help Now Plus | Home row, free users only |
| `homeRowDetail` | The extra situation videos and the printable cheat sheets | Home row |
| `homeRowLabel` | Help Now Plus: see what's included | Home row, for screen readers |

Kept on purpose, not shown as text: the two policy links in `PLUS_LINKS` (`https://dementiasuccesspath.com/privacy-policy`, the page the store listings use; `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`, Apple's standard license agreement, which the App Store listing uses because DSP has no terms page of its own; Android shows the privacy policy only) and the endpoint `PLUS_EVENTS_URL` in `utils/priceTest.ts`.

Removed: the cheat sheet card's "Members get a printable cheat sheet for this situation" and its "Learn about the membership" link (Android and web). The login screen's membership links and the Help Now members-only notice are unchanged.
