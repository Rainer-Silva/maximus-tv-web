#!/usr/bin/env bash
# Builds the web app into docs/ (served by GitHub Pages from main /docs)
# and an unsigned Tizen widget into dist/ (dist/ is git-ignored).
set -euo pipefail
cd "$(dirname "$0")"
VER=$(grep -o "VERSION = '[0-9.]*'" src/app.js | grep -o "[0-9.]*")
mkdir -p docs dist/tizen-stage
# refresh the iptv-org logo index only when asked (REFRESH_LOGOS=1 ./build.sh)
[ "${REFRESH_LOGOS:-0}" = 1 ] && node tools/build-logos.js
# stamp the version into cache-busting query strings, sw cache name and version.json
sed -i -E "s/(app\.css|app\.js|classify\.js|logokey\.js|hls\.min\.js)(\?v=[0-9.]+)?\"/\1?v=$VER\"/g" src/index.html
sed -i -E "s/mtv-v[0-9.]+/mtv-v$VER/" src/sw.js
printf '{"version":"%s"}\n' "$VER" > src/version.json
cp -r src/. docs/ && touch docs/.nojekyll
cp src/{index.html,app.css,app.js,classify.js,logokey.js,logos-index.json,hls.min.js,logo.svg,icon.png,icon-192.png,icon-512.png,apple-touch-icon.png} dist/tizen-stage/
sed "s/version=\"[0-9.]*\" viewmodes/version=\"$VER\" viewmodes/" tizen/config.xml > dist/tizen-stage/config.xml
python3 -c "import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', 'dist/tizen-stage')" "dist/maximus-tv-$VER-unsigned" && mv -f "dist/maximus-tv-$VER-unsigned.zip" "dist/maximus-tv-$VER-unsigned.wgt"
echo "Built docs/ and dist/maximus-tv-$VER-unsigned.wgt (v$VER)"
