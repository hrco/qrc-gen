# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A public, free QR code generator with a SpectreHawk-flavored dark UI, **plus a stateless Docker microservice API** for programmatic QR generation. Two halves:

| Component | Location | Stack | Deploy |
|-----------|----------|-------|--------|
| **Web UI** | `src/` | Next.js 16 + TS + Tailwind v4 + `qr-code-styling` | Vercel (free, static) |
| **API** | `api/` | Python + FastAPI + segno + Pillow | Docker container (fly.io / free-tier VM) |

The Web UI is fully client-side — no API routes, no database, no auth. The API is independently deployable and handles logo embedding + batch ZIP generation.

## Stack

### Web UI (`src/`)
- **Next.js 16** (App Router, src dir, Turbopack dev)
- **TypeScript**
- **Tailwind CSS v4**
- **`qr-code-styling`** — the QR engine. Chosen over `qrcode` because it natively supports rounded dots, custom corner ("eye") shapes, gradients, and logo-image overlay with safe-zone clearing. All work is client-side; the lib uses canvas + SVG under the hood.

### API (`api/`)
- **Python 3.12 + FastAPI** — async endpoint handlers
- **segno** — QR matrix generation (SVG + PNG output)
- **Pillow** — logo compositing, PNG encoding
- **httpx** — async logo URL fetching
- Single container, stateless, runs on `:8080`
- Health check at `GET /health`
- CORS enabled for browser access

## Architecture

### Web UI (`src/`)
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

### API (`api/`)
```
api/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
├── README.md
└── app/
    ├── main.py          # FastAPI app, CORS, GET /qr, POST /batch, GET /health
    ├── models.py        # Pydantic models + input validation (size, hex, batch caps)
    └── qr_generator.py  # segno QR gen + Pillow logo compositing + httpx logo download
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

### Web UI
```bash
npm run dev      # Turbopack dev server on :3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

### API
```bash
cd api
docker compose up --build   # build and run on :8080
docker build -t qrc-gen-api . && docker run -d -p 8080:8080 qrc-gen-api
```

No test runner is wired up yet. When tests come, the natural targets are `lib/formatters.ts` (pure string transformers) — Vitest fits the Next.js + TS stack; and `api/app/` (pytest + httpx for endpoint tests).

## Deploy

### Web UI
```bash
vercel              # preview deploy
vercel --prod       # promote to production
```

### API
```bash
# Build image, push to registry, run on any free-tier VM
docker build -t qrc-gen-api .
# Target: qr.donotpanic.space behind nginx/Caddy with TLS
```

GitHub remote: **`git@github.com:hrco/qrc-gen.git`** (public repo — the tool itself is public-facing). Use the `hrco` GitHub account per global config.

## API Reference

### `GET /health` → `{"status":"ok"}`

### `GET /qr`
| Param  | Type   | Required | Default  | Limits                    |
|--------|--------|----------|----------|---------------------------|
| data   | string | yes      | —        | 1–4096 chars              |
| format | string | no       | png      | png, svg                  |
| size   | int    | no       | 400      | 80–4096                   |
| ecc    | string | no       | M        | L, M, Q, H                |
| margin | int    | no       | 4        | 0–100                     |
| fg     | string | no       | #000000  | hex color                 |
| bg     | string | no       | #FFFFFF  | hex color                 |
| logo   | string | no       | —        | http/https URL, auto-bumps ecc→H |

### `POST /batch`
```json
{ "items": [{"id":"a","data":"..."}], "format":"png", "size":400, "ecc":"M", "fg":"#000", "bg":"#FFF", "logo":"https://..." }
```
→ ZIP of `{id}.png|svg` files. Max 200 items.

## Next Steps / Post-v1 Territory

- **API → Web UI bridge.** Let the `src/` frontend call `/qr` as a fallback generator when `qr-code-styling` can't handle a payload (e.g. very long URLs pushing version limits on canvas).
- **QR style API.** Expose dot style, corner shape, gradient params in the API — currently static square modules only (segno). Consider using `qrcode` + `qrcode-artistic` for styled server-side output.
- **Batch from CSV.** Accept `multipart/form-data` with a CSV file → ZIP download (common b2b use case: restaurant menus, event badges).
- **API key / rate limiting.** Before going public: simple token auth + per-IP rate limiter (Starlette middleware or nginx).
- **Cache layer.** Identical `(data, ecc, size, fg, bg, logo)` combos hit often — Redis or in-memory LRU cuts segno render time in half.
- **Web UI tests.** Vitest for `lib/formatters.ts`, Playwright for the preview/download flow.
- **API tests.** pytest + httpx for all endpoints, logo compositing edge cases.
- **More content types in API.** Encoders for WiFi, vCard, geo, SMS (port formatters.ts logic to Python).
- **Deploy API to qr.donotpanic.space.** Set up nginx/Caddy reverse proxy with Let's Encrypt on a free-tier Oracle/AWS VM.
