#!/bin/sh
# Baut die eigene App nach $1/app/ (Repo-Ordner)
set -e
D="$(cd "$(dirname "$0")" && pwd)"; OUT="$1/app"
mkdir -p "$OUT"
cp "$D/manifest.webmanifest" "$OUT/manifest.webmanifest"
sed "s/__BUILD__/$(date -u +%Y%m%d%H%M%S)/" "$D/sw.js" > "$OUT/sw.js"
cp "$D/vendor/supabase.js" "$OUT/supabase.js"
cp "$D/vendor/591.supabase.js" "$OUT/591.supabase.js"
mkdir -p "$OUT/vendor/fonts" "$OUT/vendor/pdfjs"; cp "$D"/vendor/fonts/*.woff2 "$OUT/vendor/fonts/"; cp "$D"/vendor/pdfjs/*.js "$OUT/vendor/pdfjs/"
{
  printf '<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  printf '<meta name="robots" content="noindex"><link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
  printf '<link rel="manifest" href="/app/manifest.webmanifest"><meta name="theme-color" content="#0f6e73"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Kalender"><meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
  printf '<script>if ("serviceWorker" in navigator) addEventListener("load", function () { navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).catch(function () {}); });</script>\n'
  printf '<style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0}\n'
  # Schriften selbst ausliefern (keine Verbindung zu Google Fonts)
  for w in 400 500 600; do printf '@font-face{font-family:"IBM Plex Sans";font-weight:%s;font-display:swap;src:url(/app/vendor/fonts/ibm-plex-sans-latin-%s-normal.woff2) format("woff2")}\n' $w $w; done
  printf '@font-face{font-family:"Fraunces";font-weight:600;font-display:swap;src:url(/app/vendor/fonts/fraunces-latin-600-normal.woff2) format("woff2")}\n'
  printf '@font-face{font-family:"IBM Plex Mono";font-weight:500;font-display:swap;src:url(/app/vendor/fonts/ibm-plex-mono-latin-500-normal.woff2) format("woff2")}\n'
  printf '</style>\n'
  printf '<script src="/app/supabase.js"></script>\n<script>window.MK_CFG = %s;</script>\n' "$(cat "$D/app-config.json")"
  printf '<script>\n'; cat "$D/shim-app.js"; printf '</script>\n'
  printf '</head><body>\n'
  grep -v "fonts.googleapis.com" "$D/page.html"
  printf '\n<script>\n'; cat "$D/app.js"; printf '</script>\n</body></html>\n'
} > "$OUT/index.html"
echo "gebaut: $OUT/index.html"
