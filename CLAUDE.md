# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A public, free QR code generator with a SpectreHawk-flavored dark UI. Single-page Next.js app, **fully client-side** generation — no API routes, no database, no auth. Designed to deploy as a static-ish Vercel site that costs nothing to run.

## Stack

- **Next.js 16** (App Router, src dir, Turbopack dev)
- **TypeScript**
- **Tailwind CSS v4**
- **`qr-code-styling`** — the QR engine. Chosen over `qrcode` because it natively supports rounded dots, custom corner ("eye") shapes, gradients, and logo-image overlay with safe-zone clearing. All work is client-side; the lib uses canvas + SVG under the hood.
- **Deploy:** Vercel (free tier). Static-friendly — the only runtime is the browser.

## Architecture

```
src/
  app/
    layout.tsx     → root layout, fonts, dark theme defaults, OG metadata
    page.tsx       → the single page: hero + tabs + customization + preview + download
    globals.css    → Tailwind base + neon accent CSS vars
  components/
    ContentTabs/   → URL/Text, WiFi, vCard inputs (one component per type)
    StylePanel/    → color pickers, dot/eye style selectors, optional overlay toggle
    QRPreview/     → mounts qr-code-styling into a ref'd div, redraws on config change
    DownloadBar/   → PNG + SVG download buttons
  lib/
    qr.ts          → QRConfig type + buildOptions() that maps config → qr-code-styling Options
    formatters.ts  → encodeURL(), encodeWifi(), encodeVCard() — turn typed input into the string the QR encodes
```

### Key architectural rules

- **Client-side only.** Anything QR-generation-related must be a client component or run in `useEffect`. `qr-code-styling` touches `window` and breaks during SSR. Use dynamic imports with `ssr: false` for the preview component.
- **Single source of truth.** The whole UI is driven by one `QRConfig` object held in `app/page.tsx` state and passed down. Children emit changes via callbacks — no global store needed for v1.
- **Auto error-correction bump.** When the optional overlay (logo image OR center text) is enabled, the QR config silently switches error correction from `M` → `H` so the overlay's ~20% center occlusion stays scannable. Users never see the EC level — it's an implementation detail.
- **Formatters are pure.** `encodeWifi()` / `encodeVCard()` return plain strings (`WIFI:T:WPA;S:...;P:...;;`, `BEGIN:VCARD\n...END:VCARD`). They're the boundary between typed-form state and the generic QR engine. Keep them small, pure, and tested.
- **Center text is rendered, not encoded.** When the overlay is "short text," it is drawn as an image overlay on top of the QR — it's NOT part of the encoded payload. The encoded payload is still the URL/WiFi/vCard string.

### Visual identity

- Black background, neon accent (cyan/hawk-green), monospace font for code-y bits.
- Terminal/oracle vibe — see [hrco/hawkaicli](https://github.com/hrco/hawkaicli) for tonal reference.
- Tagline carries SpectreHawk attitude — punchy, ~20% sarcasm, never overkill.

## Commands

```bash
npm run dev      # Turbopack dev server on :3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

No test runner is wired up yet. When tests come, the natural target is `lib/formatters.ts` (pure string transformers) — Vitest fits the Next.js + TS stack with the least friction.

## Deploy

```bash
vercel              # preview deploy
vercel --prod       # promote to production
```

GitHub remote: **`git@github.com:hrco/qrc-gen.git`** (public repo — the tool itself is public-facing). Use the `hrco` GitHub account per global config.

## What NOT to add (yet)

YAGNI. Post-v1 territory:
- Server-side generation / API route (no reason — encoding is trivial CPU work).
- User accounts, saved QRs, history.
- Bulk / CSV-driven QR batch generation.
- QR analytics / scan tracking (would require a redirect service — out of scope for a free static tool).
- More content types beyond URL/Text + WiFi + vCard (e.g. SMS, geo, calendar) until someone actually asks.
