# Maximus TV — plan for installable apps

**Date:** 21 November 2026 (Europe/Stockholm)  
**Status:** planning only. This file is a plan. It does not change the app, and nothing has been purchased or submitted.

Maximus TV is a vanilla JS web app (no backend). Source lives in `Rainer-Silva/maximus-tv-web` on branch `main`, with the built site in `docs/` (GitHub Pages: https://rainer-silva.github.io/maximus-tv-web/). It plays user-supplied Xtream / M3U IPTV via an HTML `<video>` element and hls.js. A Tizen manifest already exists at `tizen/config.xml`; `build.sh` already produces an unsigned `.wgt`. Logins, profiles and progress stay on the device (`localStorage` + IndexedDB). Default live format is HLS (`.m3u8`); MPEG-TS (`.ts`) is optional in Settings and already fails with a hint on players that cannot play TS.

Rainer is in Sweden, has a Mac and a Samsung TV, and uses NordicStream (HTTP on port 2095; HTTPS on port 443 also works). Any spend needs his explicit approval first (idea-test cap 2,000 kr).

## What to do, in order

**Personal installs first. Public stores later, and only if he wants to share the app.** Stores add fees, review risk and ongoing upkeep. For his own iPhone, Android phone and TVs, sideload / Developer Mode is enough.

1. **No-spend first step: install a signed build on his Samsung TV** (see below). The packaging path already exists; this is the highest-value personal install.
2. Keep using the iPhone Home Screen web app until a native wrapper is actually needed (usually: TS playback, or a proper icon that does not depend on Safari).
3. Wrap the same web build with **Capacitor** for Android (sideload an APK, free) and, if wanted, iOS (free 7-day Xcode signing to test).
4. Add a **webOS** packaged app and install it on an LG TV only when he has one at hand.
5. Pay for store accounts **only** if he wants TestFlight / a stable iPhone install without weekly re-signing, or a public listing.

Keep one git branch (`main`) and one web deployment (GitHub Pages). Native projects (`ios/`, `android/`, `webos/`) should live in the same repo when we build them — not as a second site or a second host.

---

## 1. iPhone and iPad

### Recommended approach
Wrap the existing `docs/` (or `dist/web`) build with **[Capacitor](https://capacitorjs.com/docs/getting-started)**. Capacitor is made for existing JS apps: add a `package.json`, point `webDir` at the built assets, then `npx cap add ios` and open the project in Xcode on his Mac. The app already has `<script>` tags and relative asset paths, which Capacitor needs.

A pure Home Screen web app (today’s setup) stays useful and costs nothing. A native wrapper is worth it for a real home-screen icon, better video, and HTTP stream access that Safari can block.

### Personal / private install (no store)
- **Free Apple Account + Xcode “Personal Team”:** Apple documents that you can install on your own devices without joining the paid program. Limits: up to 10 App IDs, 3 devices and 3 apps per device; **provisioning profiles expire 7 days after issuance**, so the app must be rebuilt and reinstalled weekly. Official: [Developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account/).
- **Paid Apple Developer Program:** TestFlight (up to 10,000 testers) or Ad Hoc installs that last for the membership year, plus App Store submission if wanted. Official program page: [Apple Developer Program](https://developer.apple.com/programs/).

He must use **his Mac** and Xcode, plug in (or wirelessly pair) the iPhone, and trust the developer certificate on the phone.

### Public store
App Store via App Store Connect, after paid membership. Review typically takes a few days [inferred; Apple does not guarantee a time]. Sweden is in the EU, so alternative distribution / web distribution under the DMA exists, but it is a poor fit for a personal IPTV player — ignore it unless he later wants a public business.

### Cost (verified)
- **Apple Developer Program: 99 USD per year**, “in local currency where available.” Taxes may be added at the rate for his region. Official: [Program enrollment — Payment](https://developer.apple.com/help/account/membership/program-enrollment/). The exact SEK figure (and VAT) is only shown at checkout — treat any krona conversion as [inferred] until he sees the payment screen.
- Apple Developer Enterprise Program (299 USD/year) is for employee-only company distribution. Not relevant.
- Xcode and a free Apple Account are free.

### Store policy risk (IPTV)
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (last updated 16 October 2026):

- **5.2.1** — do not use third-party trademarks or copyrighted material you do not own (no Netflix-style branding in the store listing; no channel logos you do not have rights to use in screenshots).
- **5.2.2** — if the app accesses a third-party service, you must be permitted to do so under that service’s terms; **authorization must be provided upon request**.
- **5.2.3 Audio/Video Downloading** — apps must not facilitate illegal file sharing or include the ability to save, convert or download media from third-party sources without authorization. **Streaming may also violate a service’s terms**; authorization must be provided upon request.

How compliant players get through: ship a **generic player** with **no bundled channels, playlists or providers**; the user pastes their own Xtream login or M3U; no “free IPTV”, no piracy marketing, no copyrighted show art in screenshots; Watch later / favourites are bookmarks, not downloads; a short in-app notice that the user is responsible for using a lawful source. Review notes should say this clearly. Do **not** pre-fill NordicStream or any other provider. Apple can still reject or later remove the app, especially if review believes it exists to stream unlicensed TV — that risk never goes to zero.

For personal use, skip the store and sideload.

### Technical changes
- **Video:** Safari / WKWebView usually play HLS (`.m3u8`) natively (`video.canPlayType('application/vnd.apple.mpegurl')` is already in the app). **Raw MPEG-TS (`.ts`) often will not play** in the web view. If he needs TS, add a small native plugin that uses **AVPlayer for HLS** and a fallback such as **MobileVLCKit** for TS. Until then, keep Settings on “HLS (m3u8)”.
- **HTTP streams / ATS:** iOS App Transport Security blocks plain HTTP. NordicStream also serves HTTPS on port 443 — prefer HTTPS. For other user-supplied HTTP servers, add targeted ATS exceptions. Official options: [`NSAllowsArbitraryLoadsInWebContent`](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity) (WKWebView) and [`NSAllowsArbitraryLoadsForMedia`](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloadsformedia) (AV Foundation; requires App Store justification if set to YES). Do not turn on global `NSAllowsArbitraryLoads` unless there is no other way.
- **Storage:** keep the existing localStorage + IndexedDB backup, and [inferred] also mirror login/profiles through Capacitor Preferences so iOS cannot quietly evict the web view’s storage.
- Disable or bypass the **service worker** inside the native shell (it is for GitHub Pages caching).
- Remote keys already work; iPhone uses touch.

### Time
- Capacitor + Xcode shell that loads the existing UI: **1–2 days**.
- ATS, storage hardening, no service worker: **1 day**.
- Native TS/HLS player plugin, if needed: **3–7 days**, plus testing on his iPhone (NordicStream blocks some non-home networks).
- App Store listing, privacy text, review notes: **2–4 days**, then waiting on Apple.

### What Rainer must do
Create or use his Apple Account (2FA on). Be at the Mac and iPhone for pairing and trust-certificate prompts. If he wants TestFlight or the App Store: enrol as an **individual**, pay **99 USD/year + any tax** (needs his explicit approval), and complete identity checks. For review, he would need a legal demo source or a reviewer login that does not imply unlicensed TV. He should not send passwords in chat.

---

## 2. Android phones (and Android TV / Google TV)

### Recommended approach
The same **Capacitor** project, with `npx cap add android`, opened in Android Studio on his Mac. One codebase, two platforms.

**Android TV / Google TV:** not fully automatic, but close to trivial for a **sideload**. Official TV setup is a few manifest entries: `LEANBACK_LAUNCHER`, `android.software.leanback` (required=false so the phone APK still works), `touchscreen` not required, and a 320×180 banner. Official: [Create and run a TV app](https://developer.android.com/training/tv/get-started/create). The app already has D-pad / remote navigation. Play Store TV listing has extra [TV app quality](https://developer.android.com/training/tv/get-started/create) rules — treat store-on-TV as a later, separate step. Sideload on a Google TV box is the low-effort path.

### Personal / private install
Build a signed APK or AAB and sideload: enable “Install unknown apps” on the phone, or use `adb install`. No Google fee. He can also use Internal testing in Play Console after paying the fee, if he wants easier updates.

### Public store
Google Play, after a Play Console account. For **personal** accounts created after 13 November 2023, Google requires a **closed test with at least 12 testers opted in continuously for 14 days** before you can apply for production. Official: [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) and [Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en). Identity verification is required; a government ID may be requested.

### Cost (verified)
- **Google Play Console: US$25, one-time registration fee.** Official: [Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en). Card payment; prepaid cards are not accepted.
- Sideloading an APK costs nothing.
- Android Studio is free.

### Store policy risk (IPTV)
Google Play does not publish a policy titled “IPTV”. The binding rule is the [Intellectual Property](https://support.google.com/googleplay/android-developer/answer/9888072?hl=en) policy: apps and listings must not infringe copyright, and **must not encourage or induce infringement**, including **unauthorized streaming**. Screenshots or descriptions that invite people to play unlicensed TV are a common reason for removal.

Same compliance pattern as Apple: generic player, user-supplied playlist, no bundled content, no piracy marketing, user-responsibility notice, original screenshots. Reviewers need a way to open the app (it can start empty until a source is added). Risk remains if Google later decides the app’s purpose is unlicensed IPTV.

### Technical changes
- **Cleartext HTTP:** Android 9+ blocks plain HTTP by default. Allow it with a [network security config](https://developer.android.com/privacy-and-security/security-config) (`cleartextTrafficPermitted="true"`, ideally not as a blanket rule forever) and/or `android:usesCleartextTraffic="true"`. Prefer NordicStream HTTPS when the user enters a server.
- **Video:** Chrome WebView often plays HLS; TS is unreliable. For TS or stubborn streams, use **ExoPlayer** (or a Capacitor media plugin) instead of hls.js.
- **Storage:** same hardening as iOS (do not rely on WebView storage alone for the login).
- Internet permission (Capacitor adds this). No service worker in the native shell.
- Android TV: manifest + banner + confirm D-pad in the existing TV layout.

### Time
- Capacitor Android shell + HTTP config + APK sideload: **1–2 days**.
- ExoPlayer path if WebView playback fails: **2–5 days**.
- Android TV sideload polish: **0.5–1 day** on top, plus a TV or emulator to test.
- Play Store (account, 14-day / 12-tester closed test, listing): **3+ weeks elapsed**, even if the coding is done.

### What Rainer must do
Install the APK (or plug the phone in for `adb`). For Play Store: a Google Account, pay **US$25** (his approval first), identity check, and — if he wants a public listing — recruit 12 people who stay opted in for 14 days. For Android TV, a device with USB debugging or “unknown sources” enabled.

---

## 3. Samsung TV (Tizen)

### Recommended approach
Package the existing web app as a **Tizen `.wgt`**. This is already started: `tizen/config.xml` (widget id `MaxTVxtrm.maximustv`, privileges for internet and `tv.inputdevice`, `access origin="*"`), and `build.sh` outputs `dist/maximus-tv-<ver>-unsigned.wgt` plus a `dist/tizen-stage/` folder. Official install path: [TV Device](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) and [Creating Certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html).

### Personal / private install
Retail TVs will not run an unsigned widget. On his Mac:

1. Install **Tizen Studio** with the TV extensions and Certificate Manager (free).
2. On the TV: Apps panel → enter **12345** → turn **Developer mode** on → enter the Mac’s LAN IP → reboot. Official steps: [TV Device](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html).
3. Create a **Samsung certificate profile** (free Samsung account): author certificate + distributor certificate that includes the TV’s **DUID**. Keep a backup of `author.p12` — updates must be signed with the same author certificate.
4. `./build.sh`, then  
   `tizen package -t wgt -s <profile> -- dist/tizen-stage`  
   and install with `sdb connect <TV-IP>` / `tizen install`.

USB install of widgets is **not supported** (Samsung’s official FAQ). Both the Mac and the TV must be on the same network.

Official Samsung docs **do not state a time limit** for Developer Mode. Some unofficial guides claim it expires; treat that as **[unverified]**. Plan to leave Developer Mode on, and re-enable it if a firmware update turns it off.

### Public store
[Samsung Apps TV Seller Office](https://developer.samsung.com/tv-seller-office/guides/overview.html). Sign-up is with a Samsung Account.

**Important geographic limit:** a new account starts as a **Public Seller**, and a Public Seller “can launch TV application services **only in the United States**.” To publish in Sweden (or anywhere else), he would need to become a **Partner Seller**, which requires an offline contract with Samsung HQ or a local subsidiary and approval by a Samsung Content Manager. Official: [Becoming Seller Office Members](https://developer.samsung.com/tv-seller-office/guides/membership/becoming-seller-office-member.html).

For a personal app in Sweden, **sideload is the realistic path**. A public Nordic listing is uncertain and may be impossible without a partnership.

Seller Office also runs QA against a [development checklist](https://developer.samsung.com/smarttv/develop/development-checklist/development-checklist.html) (playback, remote, multitasking, performance).

### Cost (verified)
- Tizen Studio, a Samsung account, and a **developer certificate are free**.
- Official Seller Office membership pages **list no registration fee**. Treat store sign-up as free unless the form later shows otherwise.
- If the app ever used Samsung Checkout, Samsung’s terms state a **70/30** revenue split. Irrelevant for a free personal app.

### Store policy risk
Samsung’s Seller Office terms require the seller to warrant that the app and its use do not infringe third-party rights. QA includes a content check. There is no public “IPTV policy” page with a simple pass/fail rule. Use the same generic-player pattern. The larger blocker for Rainer is the **US-only Public Seller rule**, not the fee.

### Technical changes
Mostly already done (remote keys, 1080p landscape, internet privilege, wildcard access for stream hosts). On a real TV, confirm:

- HLS vs TS playback (Tizen’s engine differs from Chrome; hls.js may or may not be needed).
- HTTP vs HTTPS for NordicStream.
- That login storage survives TV sleep and app updates (re-sign with the **same** author certificate).
- App size: the built widget now includes `logos-index.json` (~2.8 MB); fine for sideload, worth watching if store limits appear later [inferred].

### Time
- First signed install on his TV, with him at the set: **30–45 minutes** once Tizen Studio is installed, plus **1–2 hours** to install the SDK if it is not already on the Mac.
- Playback and remote fixes after first run: **0.5–2 days**.
- Seller Office (if ever): account + package + QA wait, often **1–3 weeks** [inferred], and Partner status for Sweden is open-ended.

### What Rainer must do
Be at the Samsung TV and Mac on the same Wi-Fi. Put the TV in Developer Mode (12345). Create a free Samsung account if he does not have one. Approve nothing paid unless he later chooses the store path. Keep the author certificate backup somewhere safe (not in the public repo, and not in chat).

---

## 4. LG TV (webOS)

### Recommended approach
Package the same web app as a **webOS `.ipk`** with the official **webOS CLI** (`ares-package`, `ares-install`, `ares-setup-device`). Official: [CLI introduction](https://webostv.developer.lge.com/develop/tools/cli-introduction) and [CLI developer guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide). Add a `webos/appinfo.json`, icons, and `index.html` (a packaged app, not a hosted wrapper of GitHub Pages). The CLI command is:

```bash
ares-package ./webos-stage -o dist
ares-install --device <tv> dist/<id>_<version>_all.ipk
```

LG signs store uploads itself; personal installs go through Developer Mode and do not need a seller certificate.

### Personal / private install
1. Create a free account on the [LG Developer site](https://webostv.developer.lge.com/).
2. On the TV, install the **Developer Mode** app from LG Apps, sign in, turn **Dev Mode Status** on (the TV reboots). Official: [App Testing with Developer Mode App](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app).
3. Same network as the Mac. `ares-setup-device` (port **9922**, user **prisoner**), start **Key Server** on the TV, then `ares-novacom --getkey` and type the on-screen passphrase.
4. `ares-package` / `ares-install`.

**Session limit:** official docs say Developer Mode is enabled “for a limited time.” The remaining time is shown as **Remain Session**. Click **EXTEND** while the TV is online **before it reaches zero**. If it runs out, Developer Mode turns off, **sideloaded apps are uninstalled**, and you cannot extend after expiry. Official docs **do not state the number of hours**. Many developer guides report **about 50 hours** — treat 50 hours as **[unverified]** and read the number on the TV. This is the main downside versus Samsung for long-term personal use: he would need to open the Developer Mode app and press EXTEND on a schedule.

### Public store
[LG Seller Lounge](https://seller.lgappstv.com/) (`seller.lgappstv.com`). Individual or Corporate seller. Official overview: [App ecosystem](https://webostv.developer.lge.com/distribute/app-ecosystem). Submission needs the `.ipk`, store images, a **UX scenario** and a completed **self-checklist**. QA is pretest + function test + **content test**. Official: [App approval process](https://webostv.developer.lge.com/distribute/app-approval-process). Updates are reviewed again. LG Apps is described as available in 36 countries (Sweden’s inclusion should be checked in Seller Lounge at submission time) [inferred until confirmed in the form].

### Cost (verified)
- Developer site account, Developer Mode app, and webOS CLI: **free**.
- Official Seller Lounge / app-ecosystem pages **do not list a registration or submission fee**. Treat as free unless the sign-up form says otherwise.

### Store policy risk
LG’s content test is meant to “rule out any possibility of containing inappropriate content.” No detailed public IPTV rule set was found. Use the same generic-player pattern. A content test that expects playable video may be awkward for an empty player — prepare a lawful demo stream or a clear empty-state walkthrough in the UX scenario [inferred].

### Technical changes
- New `appinfo.json` (id, vendor, main, icon, resolution, `vendor` / `largeIcon`).
- Map **LG remote key codes** (they differ from Tizen). The app already has a TV-remote layer; this is an extension, not a rewrite.
- Confirm HLS/TS and HTTP/HTTPS on a real webOS engine.
- Storage across Developer Mode expiry: when the session dies the app is **removed**, so logins go with it unless he exports a backup first. The in-app backup/restore (once finished) matters more here than on Samsung.

### Time
- Scaffold + package + first install, with an LG TV at hand: **1–2 days**.
- Remote-key and playback polish: **1–2 days**.
- Seller Lounge paperwork and QA wait: often **about three weeks** is cited by third-party guides; LG does not publish a fixed time [unverified].

### What Rainer must do
He needs an **LG webOS TV on the same network** (none is assumed from earlier work — only a Samsung TV is confirmed). Create a free LG Developer account, install Developer Mode, and press **EXTEND** before the session ends. Seller Lounge only if he wants a public listing.

---

## Policy pattern (all stores)

Ship Maximus TV as a **blank player**:

- No channels, M3U, Xtream portal, or provider name bundled or recommended in the app, screenshots, or description.
- User pastes their own server + login, or a playlist file.
- No download-to-disk of programmes (Watch later is a reminder, not a file).
- No “free IPTV”, cracked lists, or copyrighted poster art.
- Short terms: the user is responsible for having the right to use their source.
- Prefer the name “Maximus TV” and original artwork only.

That is how generic players typically remain listed. It is not a guarantee. For Rainer’s own devices, **sideload avoids this review**.

This is not legal advice.

---

## Shared technical notes

- One web codebase; native shells only add a player fallback, HTTP exceptions, storage, and platform manifests.
- Prefer **HTTPS** for NordicStream (`https://` on port 443) in native apps so ATS / cleartext exceptions stay narrow.
- Keep **HLS (m3u8)** as the default; add a native TS engine only if a device needs it.
- Do not commit certificates, keystores, or IPTV passwords to GitHub (the public repo must stay credential-free).
- Test playback on the home network: some IPTV servers refuse datacentre IPs (already seen from the build machine).

---

## Costs at a glance

| Platform | Personal install | Public store account | Recurring |
|---|---|---|---|
| iPhone / iPad | Free 7-day Xcode signing | Apple Developer Program **99 USD/year** + possible regional tax | Yearly if he stays in the program |
| Android / Android TV | Free APK sideload | Play Console **US$25 once**, plus 12 testers × 14 days for a personal account | None for the account fee |
| Samsung Tizen | Free cert + Developer Mode | Seller Office: **no fee listed**; Public Seller is **US-only**; Sweden needs Partner status | None listed |
| LG webOS | Free Developer Mode (limited session; extend before expiry) | Seller Lounge: **no fee listed** | None listed |

Do not pay any of these until Rainer approves the specific amount.

---

## Recommended no-spend first step

**Sign and install Maximus TV on his Samsung TV this week.** He already has the TV, the Mac, `tizen/config.xml` and the unsigned widget. Needed from him: ~45 minutes at the TV (Developer Mode 12345, Mac IP, reboot) and a free Samsung account. No store, no fee.

In parallel he can keep the iPhone Home Screen web app. Next no-spend step after the TV works: a Capacitor Android APK he can sideload, then an iOS test build that he re-signs every 7 days — or the paid Apple programme only if he wants that weekly step to go away.
