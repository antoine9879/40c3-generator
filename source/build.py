#!/usr/bin/env python3
"""Build the 40C3 Visual Generator into a static, deployable folder.
usage: python3 build.py <styleguide_dir> <gifenc.esm.js> <esbuild_bin> <out_dir>"""
import json, base64, pathlib, sys, re, hashlib, subprocess, shutil
here = pathlib.Path(__file__).parent
sg, gifenc_src, esbuild, out = map(pathlib.Path, sys.argv[1:5])
src = here/"src"
if out.exists(): shutil.rmtree(out)
(out/"assets").mkdir(parents=True)

def minify(code, loader):
    r = subprocess.run([str(esbuild), f"--loader={loader}", "--minify", "--target=es2020,chrome90,firefox90,safari15" if loader=="js" else "--target=chrome90,firefox90,safari15"],
                       input=code.encode(), capture_output=True)
    if r.returncode: sys.exit(r.stderr.decode())
    return r.stdout.decode()

# --- assets (SVG) ---
assets = {}
for p in sorted((sg/"Assets").rglob("*.svg")):
    t = re.sub(r"<\?xml[^>]*>\s*", "", p.read_text(encoding="utf-8")).strip()
    t = re.sub(r">\s+<", "><", t)
    assets[str(p.relative_to(sg/"Assets")).replace("\\","/")] = t

# --- css + embedded fonts (embedded so the page also works when opened from disk) ---
def b64(f): return base64.b64encode((sg/"fonts"/f).read_bytes()).decode()
LAT="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
EXT="U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
fonts = (f'@font-face{{font-family:"Jersey 10";src:url(data:font/woff2;base64,{b64("jersey-10-latin-400-normal.woff2")}) format("woff2");unicode-range:{LAT};font-display:block}}'
 f'@font-face{{font-family:"Jersey 10";src:url(data:font/woff2;base64,{b64("jersey-10-latin-ext-400-normal.woff2")}) format("woff2");unicode-range:{EXT};font-display:block}}'
 f'@font-face{{font-family:"Hack";font-weight:400;src:url(data:font/woff2;base64,{b64("Hack-Regular.woff2")}) format("woff2");font-display:block}}'
 f'@font-face{{font-family:"Hack";font-weight:700;src:url(data:font/woff2;base64,{b64("Hack-Bold.woff2")}) format("woff2");font-display:block}}')
css = minify((src/"style.css").read_text(encoding="utf-8").replace("/*__FONTS__*/", fonts), "css")

# --- js ---
app = (src/"app.js").read_text(encoding="utf-8").replace('"use strict";','',1)
js = minify('(function(){"use strict";\nconst ASSETS=' + json.dumps(assets, ensure_ascii=False) + ';\n' + app + '\n})();', "js")
g = re.sub(r"//# sourceMappingURL=.*$", "", gifenc_src.read_text(encoding="utf-8").strip())
m = re.search(r"export\s*\{([^}]*)\};?\s*$", g)
pairs = [p.strip().split(" as ") for p in m.group(1).split(",")]
g = "/*! gifenc 1.0.3 | (c) Matt DesLauriers | MIT */(function(){" + g[:m.start()] + "window.gifenc={" + ",".join(f"{b}:{a}" for a,b in pairs) + "};})();"

ver = hashlib.sha256((css+js+g).encode()).hexdigest()[:10]
(out/"assets"/"app.css").write_text(css, encoding="utf-8")
(out/"assets"/"app.js").write_text(js, encoding="utf-8")
(out/"assets"/"gifenc.js").write_text(g, encoding="utf-8")
(out/"index.html").write_text((src/"index.html").read_text(encoding="utf-8").replace("__V__", ver), encoding="utf-8")

# --- favicon: official cube in key color 0 ---
logo = (sg/"Assets/Logos/40C3_Logo_A.svg").read_text(encoding="utf-8")
logo = re.sub(r"<\?xml[^>]*>\s*", "", logo).replace("#ebedf0", "#75b44b")
(out/"favicon.svg").write_text(logo, encoding="utf-8")

# --- static files ---
for f in (here/"static").iterdir():
    shutil.copy(f, out/f.name)
shutil.copy(sg/"fonts/jersey-10_License.txt", out/"assets/LICENSE-Jersey10.txt")
shutil.copy(sg/"fonts/Hack-License.txt", out/"assets/LICENSE-Hack.txt")
print(f"built {out} · version {ver} · app.js {len(js)//1024} KB · app.css {len(css)//1024} KB")
