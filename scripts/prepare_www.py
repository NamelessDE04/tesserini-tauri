#!/usr/bin/env python3
"""Copia la web app (cartella web/) dentro l'APK e la rende utilizzabile offline:
caratteri e librerie Firebase locali, niente service worker/manifest."""
import pathlib
import shutil
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "web"
DST = ROOT / "app" / "src" / "main" / "assets" / "www"
FB_VER = "10.14.1"
FB_LIBS = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]

if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns("sw.js", "manifest.webmanifest"))

html = (DST / "index.html").read_text(encoding="utf-8")
lines = [l for l in html.splitlines()
         if "fonts.googleapis.com" not in l and "fonts.gstatic.com" not in l and 'rel="manifest"' not in l]
html = "\n".join(lines) + "\n"
html = html.replace('<link rel="stylesheet" href="app.css">',
                    '<link rel="stylesheet" href="fonts/fonts.css">\n<link rel="stylesheet" href="app.css">')
for lib in FB_LIBS:
    html = html.replace(f"https://www.gstatic.com/firebasejs/{FB_VER}/{lib}", f"sdk/{lib}")
(DST / "index.html").write_text(html, encoding="utf-8")

sdk = DST / "sdk"
sdk.mkdir(exist_ok=True)
for lib in FB_LIBS:
    url = f"https://www.gstatic.com/firebasejs/{FB_VER}/{lib}"
    with urllib.request.urlopen(url, timeout=60) as r:
        (sdk / lib).write_bytes(r.read())
    print("ok", lib)

if "gstatic" in html or "googleapis" in html:
    sys.exit("index.html contiene ancora riferimenti esterni")
print("www pronto")
