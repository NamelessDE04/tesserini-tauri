#!/usr/bin/env bash
# Scarica i caratteri (licenza SIL OFL) dentro l'APK, così l'app funziona offline.
set -u
DIR="app/src/main/assets/www/fonts"
BASE="https://raw.githubusercontent.com/google/fonts/main/ofl"
mkdir -p "$DIR"

get() {
  if curl -fsSL --retry 3 "$BASE/$1" -o "$DIR/$2"; then echo "ok  $2"; else echo "ERRORE $2"; rm -f "$DIR/$2"; fi
}
get "sairastencilone/SairaStencilOne-Regular.ttf" "SairaStencilOne-Regular.ttf"
get "barlowcondensed/BarlowCondensed-Medium.ttf" "BarlowCondensed-Medium.ttf"
get "barlowcondensed/BarlowCondensed-SemiBold.ttf" "BarlowCondensed-SemiBold.ttf"
get "barlowcondensed/BarlowCondensed-Bold.ttf" "BarlowCondensed-Bold.ttf"
get "jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf" "JetBrainsMono.ttf"

cat > "$DIR/fonts.css" <<'CSS'
@font-face { font-family: 'Saira Stencil One'; font-weight: 400; src: url(SairaStencilOne-Regular.ttf) format('truetype'); }
@font-face { font-family: 'Barlow Condensed'; font-weight: 500; src: url(BarlowCondensed-Medium.ttf) format('truetype'); }
@font-face { font-family: 'Barlow Condensed'; font-weight: 600; src: url(BarlowCondensed-SemiBold.ttf) format('truetype'); }
@font-face { font-family: 'Barlow Condensed'; font-weight: 700; src: url(BarlowCondensed-Bold.ttf) format('truetype'); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 100 800; src: url(JetBrainsMono.ttf) format('truetype'); }
CSS
ls -la "$DIR"
