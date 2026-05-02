# qrc-gen

> QR codes from the void. Free, no accounts, no tracking, no bullshit.

A static, single-page QR code generator with a SpectreHawk-flavored dark UI.
Encode URLs, Wi-Fi networks, or vCards. Drop in a logo or a few characters
of center text — error correction auto-bumps so the result still scans.
PNG and SVG export, all client-side.

## Features

- **3 content types** — URL/text, Wi-Fi network (WPA / WEP / open), vCard contact
- **Optional center overlay** — image upload (logo) or short text (1–6 chars)
- **Auto error-correction bump** — switches to level H whenever an overlay is on, so the QR stays scannable through ~30% occlusion
- **Style controls** — foreground/background colors, six color presets, six dot styles, three corner-square styles, two corner-dot styles
- **PNG + SVG export** — vector output is a first-class citizen
- **Zero backend** — no API routes, no database, no telemetry. Everything runs in the browser.

## Stack

- Next.js 16 (App Router, Turbopack, fully static build)
- TypeScript
- Tailwind CSS v4 (CSS-first config in `globals.css`)
- [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling) — the QR engine

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # static production build
npm run start    # serve the built site
npm run lint     # ESLint
```

## Deploy

The entire app builds to static HTML/JS — drops cleanly onto Vercel,
GitHub Pages, Cloudflare Pages, or any static host.

```bash
vercel              # preview deploy
vercel --prod       # production
```

## Project shape

```
src/
  app/
    layout.tsx     → fonts, metadata, theme
    page.tsx       → the single page (state + composition)
    globals.css    → Tailwind + design tokens
  components/
    ContentTabs.tsx   → URL / Wi-Fi / vCard inputs
    StylePanel.tsx    → colors, dot styles, overlay controls
    QRPreview.tsx     → mounts qr-code-styling, redraws on config change
    DownloadBar.tsx   → PNG + SVG download
  lib/
    qr.ts             → QRConfig + buildOptions() + textToImage()
    formatters.ts     → encodeUrl / encodeWifi / encodeVCard
```

## License

MIT.
