import io
import logging
import zipfile
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import ValidationError

from app.models import BatchRequest, ErrorCorrectionLevel, OutputFormat
from app.qr_generator import download_logo, generate_qr

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="qrc-gen API", version="1.0.0", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    # Public stateless API — wildcard origin is intentional.
    # credentials=False is required when allow_origins="*"; combining them
    # violates the CORS spec and is rejected by browsers.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

CONTENT_TYPES = {"png": "image/png", "svg": "image/svg+xml"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/qr")
async def get_qr(
    data: str = Query(..., min_length=1, max_length=4096),
    format: OutputFormat = OutputFormat.png,
    size: int = Query(default=400, ge=80, le=4096),
    ecc: ErrorCorrectionLevel = ErrorCorrectionLevel.M,
    margin: int = Query(default=4, ge=0, le=100),
    fg: str = Query(default="#000000", pattern=r"^#[0-9A-Fa-f]{3,8}$"),
    bg: str = Query(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{3,8}$"),
    logo: Optional[str] = Query(default=None, max_length=2048),
):
    fg = fg.upper()
    bg = bg.upper()

    if logo and not logo.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="logo must be an http/https URL")

    if logo and ecc != ErrorCorrectionLevel.H:
        ecc = ErrorCorrectionLevel.H

    logo_bytes = None
    if logo:
        logo_bytes = await download_logo(logo)
        if logo_bytes is None:
            raise HTTPException(status_code=400, detail="Failed to download logo image")

    result = generate_qr(
        data=data,
        format=format.value,
        size=size,
        ecc=ecc.value,
        margin=margin,
        fg=fg,
        bg=bg,
        logo_data=logo_bytes,
    )

    return Response(content=result, media_type=CONTENT_TYPES[format.value])


@app.post("/batch")
async def post_batch(req: BatchRequest):
    fg = req.fg.upper()
    bg = req.bg.upper()

    ecc = req.ecc
    if req.logo and ecc != ErrorCorrectionLevel.H:
        ecc = ErrorCorrectionLevel.H

    logo_bytes = None
    if req.logo:
        logo_bytes = await download_logo(req.logo)
        if logo_bytes is None:
            raise HTTPException(status_code=400, detail="Failed to download logo image")

    zip_buf = io.BytesIO()
    ext = req.format.value

    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in req.items:
            try:
                result = generate_qr(
                    data=item.data,
                    format=ext,
                    size=req.size,
                    ecc=ecc.value,
                    margin=req.margin,
                    fg=fg,
                    bg=bg,
                    logo_data=logo_bytes,
                )
                zf.writestr(f"{item.id}.{ext}", result)
            except Exception as e:
                logger.error("Failed to generate QR for item %s: %s", item.id, e)
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate QR for item '{item.id}': {e}",
                )

    zip_buf.seek(0)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=qrcodes.zip"},
    )
