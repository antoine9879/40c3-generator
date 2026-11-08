# 40C3 Visual Generator

A static web app to make 40C3 “Model Citizens” visuals with any text: talk cards, announcements, posters, quotes, badges and cube logos, exported as PNG, JPG, GIF or video (MP4/WebM).
Everything runs in the visitor's browser. There is no server code, no tracking, no cookies: images people add stay on their computer, and settings are kept in their browser's local storage.

## Browser support

Recent Chrome, Edge, Firefox and Safari. Video export uses the browser's recorder: MP4 in Chrome/Edge/Safari, WebM in Firefox. GIF export works everywhere.

## Rebuild from source

The `source/` folder holds the editable source (`source/src/`: `index.html`, `style.css`, `app.js`) and `source/build.py` (it needs the official style guide folder, `gifenc` and `esbuild` from npm). The `source/` folder does not need to be uploaded:

```
python3 source/build.py <styleguide folder> <gifenc.esm.js> <esbuild binary> <output folder>
```

## Credits

See `LICENSES.md`.
