# 40C3 Visual Generator

A static web app to make 40C3 “Model Citizens” visuals with any text: talk cards, announcements, posters, quotes, badges and cube logos, exported as PNG, JPG, GIF or video (MP4/WebM).

Everything runs in the visitor's browser. There is no server code, no tracking, no cookies and no upload: images people add stay on their computer, and settings are kept in their browser's local storage.

## Deploy

The folder is ready to put online as-is: upload **all files** of this folder to any static host.

- **Netlify / Cloudflare Pages**: drag and drop the folder (or point a project at it, no build command). The `_headers` file adds the security and cache headers automatically.
- **GitHub Pages**: push the folder to a repository and enable Pages on that branch.
- **nginx / Apache / any web server**: copy the files to the web root. Recommended headers:

```nginx
location / {
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'" always;
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
}
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
location = /index.html { add_header Cache-Control "no-cache"; }
```

Serve it over **HTTPS**: “Copy image” needs a secure context.

The files in `assets/` carry a version number in their URL (`?v=…`), so long cache times are safe: a new build changes the number.

For link previews (Mastodon, Signal…), replace the relative `og:image` in `index.html` by the full URL once you know your domain, e.g. `https://visuals.example.org/og-image.png`.

You can also just double-click `index.html` to use it offline.

## Browser support

Recent Chrome, Edge, Firefox and Safari. Video export uses the browser's recorder: MP4 in Chrome/Edge/Safari, WebM in Firefox. GIF export works everywhere.

## Rebuild from source

The `source/` folder holds the editable source (`source/src/`: `index.html`, `style.css`, `app.js`) and `source/build.py` (it needs the official style guide folder, `gifenc` and `esbuild` from npm). The `source/` folder does not need to be uploaded:

```
python3 source/build.py <styleguide folder> <gifenc.esm.js> <esbuild binary> <output folder>
```

## Credits

See `LICENSES.md`.
