#!/bin/sh
# Baut die eigene App nach $1/app/ (Repo-Ordner)
set -e
D="$(cd "$(dirname "$0")" && pwd)"; OUT="$1/app"
mkdir -p "$OUT"
cp "$D/vendor/supabase.js" "$OUT/supabase.js"
cp "$D/vendor/591.supabase.js" "$OUT/591.supabase.js"
{
  printf '<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  printf '<meta name="robots" content="noindex"><link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
  printf '<style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0}</style>\n'
  printf '<script src="/app/supabase.js"></script>\n<script>window.MK_CFG = %s;</script>\n' "$(cat "$D/app-config.json")"
  printf '<script>\n'; cat "$D/shim-app.js"; printf '</script>\n'
  printf '</head><body>\n'
  cat "$D/page.html"
  printf '\n<script>\n'; cat "$D/app.js"; printf '</script>\n</body></html>\n'
} > "$OUT/index.html"
echo "gebaut: $OUT/index.html"
