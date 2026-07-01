# qrc-gen API

Stateless QR code generation microservice. Python + FastAPI + segno + Pillow.

## Quick start

```bash
docker compose up --build
```

API runs on `http://localhost:8080`.

## Endpoints

### `GET /health`
```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

### `GET /qr`
Generate a single QR code.

| Param    | Type   | Required | Default    | Notes                                      |
|----------|--------|----------|------------|--------------------------------------------|
| data     | string | yes      | —          | Content to encode (max 4096 chars)         |
| format   | string | no       | png        | png or svg                                 |
| size     | int    | no       | 400        | Image size in px (80–4096)                 |
| ecc      | string | no       | M          | Error correction: L, M, Q, H               |
| margin   | int    | no       | 4          | Quiet zone modules (0–100)                 |
| fg       | string | no       | #000000    | Foreground color (hex)                     |
| bg       | string | no       | #FFFFFF    | Background color (hex)                     |
| logo     | string | no       | —          | Image URL to embed centered. Auto-bumps ecc to H. |

```bash
curl -o qr.png "http://localhost:8080/qr?data=https://example.com&format=png&size=512&fg=%23000000&bg=%23FFFFFF"

curl -o qr.svg "http://localhost:8080/qr?data=hello+world&format=svg&size=320&ecc=H"

curl -o qr-logo.png "http://localhost:8080/qr?data=https://donotpanic.space&logo=https://example.com/logo.png"
```

### `POST /batch`
Generate multiple QR codes, returned as a ZIP.

```bash
curl -X POST http://localhost:8080/batch \
  -H "Content-Type: application/json" \
  -o batch.zip \
  -d '{
    "items": [
      {"id": "table1", "data": "https://menu.example.com/table/1"},
      {"id": "table2", "data": "https://menu.example.com/table/2"}
    ],
    "format": "png",
    "size": 400,
    "ecc": "H",
    "fg": "#000000",
    "bg": "#FFFFFF",
    "logo": "https://example.com/logo.png"
  }'
```

Response: ZIP containing `table1.png`, `table2.png`, etc.

## Limits

- Max batch: 200 items
- Max QR size: 4096px
- Max data payload: 4096 chars
- Logo download max 2 MB, image types only

## Deploy

Free-tier VM ready. Set `PORT=8080` env var if needed. Put behind nginx/Caddy with TLS for `qr.donotpanic.space`.

```bash
# Build
docker build -t qrc-gen-api .

# Run
docker run -d -p 8080:8080 --name qrc-gen-api qrc-gen-api
```
