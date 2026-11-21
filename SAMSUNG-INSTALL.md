# Install Maximus TV on your Samsung TV (Mac)

This is a one-time, free install on your own TV. You do not need the Samsung app store, and you do not need to pay anything. A retail Samsung TV will only run a **signed** app, so you sign it once with a free Samsung certificate, then install it over Wi-Fi.

You need your **Mac** and your **Samsung TV on the same Wi-Fi**. USB install is not supported.

**Time:** about 45–90 minutes the first time (most of that is downloading Tizen Studio). If Tizen Studio is already installed, plan on **30–45 minutes** at the TV.

**What you were given:**

- `maximus-tv-0.6.8.wgt` — the app package (still unsigned; you will sign it in step 6)
- `maximus-tv-0.6.8-tizen-studio.zip` — the same app as a Tizen Studio project (easier if you prefer the point-and-click install)

Official Samsung references used for these steps:

- [Installing TV SDK](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)
- [TV Device (Developer Mode, connect, run)](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)
- [Creating Certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)
- [Command Line Interface](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html)
- [Tizen Studio download](https://developer.tizen.org/development/tizen-studio/download)

---

## 1. Install Tizen Studio on your Mac

1. Open the official download page: [Tizen Studio download](https://developer.tizen.org/development/tizen-studio/download).
2. Download the **IDE installer** for **macOS** (the `.dmg` file). Use the latest version offered.
3. Open the `.dmg` and run the installer.
4. Accept the licence, then install to the **default folder in your home directory** (usually `tizen-studio` in your home folder). On a Mac, putting it somewhere else can cause a Java error.
5. When the installer finishes, tick **Launch the Package Manager**, then click Finish.

If the installer will not open on an Apple silicon Mac (M1/M2/M3/M4), install Rosetta first, then try again: open Terminal and run `softwareupdate --install-rosetta`. [inferred]

If the installer asks for Java, install a JDK and retry. [inferred]

## 2. Install the TV tools and the certificate tool

1. In **Package Manager**, open the **Extension SDK** tab.
2. Click **Install** next to **TV Extensions** (the name looks like `TV Extensions-…`).
3. Click **Install** next to **Samsung Certificate Extension**. Use a current version (2.0.73 or later is required to create certificates after September 2025).
4. Accept the licences and wait until both finish.

You can open Package Manager later from Tizen Studio, or from `tizen-studio/package-manager`.

## 3. Find your Mac’s IP address

The TV needs this number.

1. On the Mac, open **System Settings → Network → Wi-Fi → Details**.
2. Write down the **IP address** (four numbers, like `192.168.1.20`).

Or in Terminal: `ipconfig getifaddr en0`

## 4. Turn on Developer Mode on the TV

The Mac and the TV must be on the **same Wi-Fi**.

1. On the TV, open **Smart Hub**, then open the **Apps** panel.
2. Scroll down to **App Settings** (on some TVs you stay on the Apps screen).
3. Using the remote, type **1 2 3 4 5**. A Developer Mode window appears.
4. Switch **Developer mode** to **On**.
5. Type the **Mac’s IP address** from step 3, then choose **OK**.
6. **Reboot the TV** (turn it fully off and on). This step is required.
7. After the reboot, open **Apps** again. You should see **Develop Mode** at the top of the screen.

Official steps: [TV Device](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html).

## 5. Find the TV’s IP and connect from the Mac

**TV IP** (the menu name varies by year):

1. On the TV, open **Settings** (the gear).
2. Go to **General → Network → Network Status** (or **Network → Network Status**).
3. Open **IP Settings** and write down the TV’s **IP address**.

**Connect:**

1. On the Mac, open **Tizen Studio**.
2. Choose **Tools → Device Manager**.
3. Click **Remote Device Manager**, then **+**.
4. Enter a name (for example `SamsungTV`), the **TV’s IP address**, and port **26101** (the usual port). Click **Add**.
5. In Device Manager, select the TV and switch **Connection** to **On**.
6. Right-click the connected TV and choose **Permit to install applications**.

Once it is connected, Device Manager also shows the TV’s **DUID**. You need that in the next step. You can also find it on the TV under **Support → Contact Samsung → Unique Device ID**.

## 6. Create a free Samsung certificate

You cannot install the app until it is signed. This certificate is free.

1. In Tizen Studio, choose **Tools → Certificate Manager**.
2. If a “Migration for Certificate Profile” window appears, click **Cancel**.
3. Click **+**. Choose **Samsung**, then **TV**, then **Next**.
4. Give the profile a name (for example `MaximusTV`) and click **Next**.
5. Choose **Create a new author certificate**, fill in the form, and click **Next**.
6. Sign in with a **free Samsung account** (create one if you do not have one).
7. Choose a **backup folder** for the certificate files and click **Next**. Keep this backup. Later updates must be signed with the **same** author certificate, or the TV will treat the app as a new app.
8. Choose **Create a new distributor certificate**. Add your TV’s **DUID** (click **+** next to the connected TV, or type it). Finish.

Official steps: [Creating Certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html).

## 7. Sign and install the app

Pick **either** the Studio method or the Terminal method.

### Option A — Tizen Studio (recommended)

1. Unzip `maximus-tv-0.6.8-tizen-studio.zip` into a folder, for example `Documents/MaximusTV`.
2. In Tizen Studio: **File → Import → General → Existing Projects into Workspace**. Choose that folder, then Finish.
3. Make sure the TV is connected in Device Manager (step 5) and that your new certificate profile is the **active** one in Certificate Manager.
4. Right-click the **MaximusTV** project → **Run As → Tizen Web Application**.

Studio signs the app with your certificate and installs it on the TV. Look for **Maximus TV** in the Apps list.

### Option B — Terminal

In Terminal, add Tizen’s tools to your path (change the folder if you installed Tizen Studio somewhere else):

```bash
export PATH="$HOME/tizen-studio/tools:$HOME/tizen-studio/tools/ide/bin:$PATH"
```

Unzip the Tizen Studio project, then sign it (replace `MaximusTV` with your certificate profile name):

```bash
cd /path/to/MaximusTV
tizen package -t wgt -s MaximusTV -- .
```

Connect and install (replace the TV IP and the `.wgt` file name that the command printed):

```bash
sdb connect 192.168.x.x
sdb devices
tizen install -n MaximusTV.wgt -- .
```

If `tizen install` asks for a target, copy the device name or serial from `sdb devices` and add `-t THAT_NAME` or `-s THAT_SERIAL`. Official examples: [Command Line Interface](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html).

You can also sign the ready-made `maximus-tv-0.6.8.wgt` by first unpacking it into a folder, then running `tizen package -t wgt -s MaximusTV -- /that/folder`. The unsigned file will not install on a retail TV by itself.

## 8. Open the app on the TV

1. On the TV, open **Apps** and find **Maximus TV**.
2. Enter your IPTV login in the app (the same one you use on your iPhone). It is stored only on the TV.
3. Arrows, Enter and Back work as usual. Colour keys and the Info key open the card menu. Play, Pause, Stop, Rewind and Fast Forward control playback.

---

## Troubleshooting

**The TV and the Mac must be on the same Wi-Fi.** Guest Wi-Fi, a VPN, or a different band (a phone hotspot vs the home router) will block the connection.

**Developer Mode did nothing / no popup after 12345.** Make sure you are on the **Apps** screen (or App Settings), then type 12345 again. Reboot the TV and retry. The menu can look slightly different on older firmware.

**“Develop Mode” is not shown after the reboot.** Developer Mode is not on until the TV has been rebooted with it switched on. Turn it on again, check the Mac IP, and reboot once more.

**Device Manager will not connect.** Check both IP addresses, port **26101**, and that Developer Mode shows the **Mac’s** IP. If the Mac later gets a new IP (typical on Wi-Fi), update it in Developer Mode and reboot the TV.

**Install fails, or “1010 : App install fail”.** This is often the certificate. Confirm the **DUID** on the distributor certificate matches this TV, that you clicked **Permit to install applications**, and that the certificate profile is active. Official note: a signing problem is a common cause of 1010.

**“You are not an authorized user!”** Update the TV firmware and Tizen Studio (including Certificate Extension) and try again.

**The app disappeared from Apps.** Developer Mode may have been turned off, or the TV may have updated its software. Turn Developer Mode back on, reconnect, and install again. [inferred — Samsung’s public docs do not clearly state when a sideloaded app is removed]

**Do not install from a USB stick.** Samsung no longer allows it.

**TVs older than 2017** (Tizen 2.x) may not accept this package, which is set for Tizen 3.0 / 2017 and later. The Developer Mode menu can also differ. [inferred]

**Keep the author certificate backup.** If you lose it, the next install is treated as a new app and the TV login is not carried over.
