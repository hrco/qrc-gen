# qrc-gen — Directory Summary

> QR codes from the void. Free, no accounts, no tracking, no bullshit.

Two deployable artifacts sharing one git repo:

## Components

| # | Name | Type | Stack | Status |
|---|------|------|-------|--------|
| 1 | **Web UI** | Static SPA | Next.js 16 + TS + Tailwind v4 + `qr-code-styling` | v1 shipped |
| 2 | **API** | Docker microservice | Python 3.12 + FastAPI + segno + Pillow | v1 done, not deployed |

## Web UI (`src/`)
- Client-side QR generator at `qrc-gen.vercel.app`
- 3 content types: URL/Text, WiFi, vCard
- Style controls: colors, dot shapes, corner styles, logo/text overlay
- Auto error-correction bump (M → H) when overlay is on
- PNG + SVG download
- **Start:** `npm run dev` → `localhost:3000`

## API (`api/`)
- Stateless QR generation at `GET /qr` and `POST /batch`
- Logo embedding via Pillow (centered, auto-sized, white safety padding)
- SVG + PNG output, custom colors, error correction L/M/Q/H
- Input validation: size 80–4096px, batch cap 200, hex colors
- CORS enabled for browser access
- **Start:** `cd api && docker compose up --build` → `localhost:8080`

## Endpoints

```
GET  /health                  → {"status":"ok"}
GET  /qr?data=...&...        → image/png or image/svg+xml
POST /batch  { items: [...] } → application/zip
```

## Quick curl

```bash
# Single PNG
curl -o qr.png "http://localhost:8080/qr?data=https://example.com&format=png&size=400"

# Single SVG with custom colors
curl -o qr.svg "http://localhost:8080/qr?data=hello&format=svg&fg=%2300FF00&bg=%23000000"

# Batch ZIP
curl -X POST http://localhost:8080/batch -H "Content-Type: application/json" \
  -o batch.zip -d '{"items":[{"id":"a","data":"hello"},{"id":"b","data":"world"}]}'
```

## Next Steps

1. **Deploy API** → `qr.donotpanic.space` behind nginx/Caddy (free-tier VM)
2. **API → Web UI bridge** → fallback to `/qr` when `qr-code-styling` hits version limits
3. **Styled QR in API** → expose dot/corner styles (segno is square-only, consider `qrcode-artistic`)
4. **CSV batch** → upload CSV → ZIP of QR images
5. **Auth + rate limiting** → API key middleware before going fully public
6. **Cache** → in-memory LRU for identical `(data,ecc,size,fg,bg,logo)` requests
7. **Tests** → Vitest for formatters, pytest for API, Playwright for UI
8. **More encoders** → port WiFi/vCard/geo/SMS formatters to Python API
