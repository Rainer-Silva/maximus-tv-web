# Maximus TV

A lightweight IPTV player for **Samsung (Tizen) TVs** and **iPhone** (home-screen web app).
Works with Xtream Codes logins, M3U links and uploaded M3U files. No backend: logins,
profiles, favourites and watch progress are stored only on the device.

**Live web app:** https://rainer-silva.github.io/maximus-tv-web/

## Features
- Netflix-style Home: personal rows on top (Continue watching, Watch later, Favourite channels, Recently watched, each with See all), then a featured movie and swipeable catalogue rows (new and top-rated movies, series by genre, live TV by type and country)
- "Who's watching?" profiles with optional PIN; per-profile Watch later (movies and series), favourite channels (pinned first in Live TV), Continue watching and recent channels
- Long-press a card (touch), or press the yellow/blue key on the TV remote, to add it to Watch later or favourites
- A–Z sorting for filters and categories, plus an A–Z / Default toggle in lists
- Live TV / Movies / Series browsing with Continent, Country, Language and Type filters (see `CLASSIFICATION.md`)
- Search across the whole catalogue
- Several IPTV sources (Xtream, M3U link, M3U file) you can switch between in Settings → Configure IPTV
- Settings: start tab, hide adult content with a PIN, parental PIN, preferred audio and subtitle language, stream format (ts/m3u8), EPG offset, theme, refresh catalogue
- TV-remote navigation (arrow keys, Enter, Back) and touch layout with iPhone safe-area support

## Repository layout
| Path | What |
|---|---|
| `src/` | App source (plain ES5 JS/CSS/HTML so old TV browsers run it) |
| `docs/` | Built site, served by GitHub Pages from `main` → `/docs` |
| `tizen/config.xml` | Tizen widget manifest |
| `build.sh` | Builds `docs/` and `dist/maximus-tv-<ver>-unsigned.wgt` (dist/ is not committed) |
| `CLASSIFICATION.md` | How categories are mapped to continent, country, language and type |

There is one branch, `main`. To release, edit `src/`, run `./build.sh`, then commit and push. Pages redeploys on its own.

## iPhone
Open the live URL in Safari → Share → **Add to Home Screen**. Then open it from the icon.

## Samsung TV (Tizen) install
Retail Samsung TVs only install **signed** widgets, so you have to sign the package once with a free Samsung certificate:
1. Install **Tizen Studio** with the TV extensions and **Certificate Manager** on a computer.
2. On the TV, open **Apps** and press `1 2 3 4 5` on the remote. Turn **Developer mode** on, enter the computer's IP address, then restart the TV.
3. In Certificate Manager, create a **Samsung** certificate profile (free Samsung account). Include the TV's DUID, which Device Manager shows once it is connected.
4. Run `./build.sh`, then package and sign the staged app:
   `tizen package -t wgt -s <profile> -- dist/tizen-stage`
5. Connect to the TV and install it:
   `sdb connect <TV-IP>` then `tizen install -n <signed>.wgt -t <device>`

No credentials are stored in this repo. Users enter their own IPTV login in the app.
