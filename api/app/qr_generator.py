import io
import logging
import re
from typing import Optional

import segno
from PIL import Image

logger = logging.getLogger(__name__)

MAX_LOGO_RATIO = 0.22
LOGO_MIN_PADDING_RATIO = 0.04
LOGO_MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024


def generate_qr(
    data: str,
    format: str = "png",
    size: int = 400,
    ecc: str = "M",
    margin: int = 4,
    fg: str = "#000000",
    bg: str = "#FFFFFF",
    logo_data: Optional[bytes] = None,
) -> bytes:
    qr = segno.make(data, error=ecc.upper(), boost_error=False)
    module_count = len(list(qr.matrix_iter(scale=1, border=0, verbose=False)))
    full_modules = module_count + 2 * margin

    if format == "svg":
        return _generate_svg(qr, module_count, full_modules, size, margin, fg, bg)

    return _generate_png(qr, module_count, full_modules, size, margin, fg, bg, logo_data)


def _generate_svg(
    qr: segno.QRCode,
    module_count: int,
    full_modules: int,
    size: int,
    margin: int,
    fg: str,
    bg: str,
) -> bytes:
    out = io.BytesIO()
    qr.save(
        out,
        kind="svg",
        scale=1,
        border=margin,
        dark=fg,
        light=bg,
        omitsize=True,
        svgclass="",
        xmldecl=False,
        svgns=True,
    )
    svg_bytes = out.getvalue()

    view_box = f"0 0 {full_modules} {full_modules}"
    svg_bytes = re.sub(
        rb'viewBox="[^"]*"',
        f'viewBox="{view_box}"'.encode(),
        svg_bytes,
        count=1,
    )
    svg_bytes = re.sub(
        rb"<svg ",
        f'<svg width="{size}px" height="{size}px" '.encode(),
        svg_bytes,
        count=1,
    )
    return svg_bytes


def _generate_png(
    qr: segno.QRCode,
    module_count: int,
    full_modules: int,
    size: int,
    margin: int,
    fg: str,
    bg: str,
    logo: Optional[bytes],
) -> bytes:
    scale_factor = max(1, size // full_modules)
    target_w = full_modules * scale_factor

    raw = io.BytesIO()
    qr.save(raw, kind="png", scale=scale_factor, border=margin, dark=fg, light=bg)
    raw.seek(0)
    qr_pil = Image.open(raw).convert("RGBA")
    raw.close()

    if qr_pil.size != (target_w, target_w):
        qr_pil = qr_pil.resize((target_w, target_w), Image.NEAREST)

    if logo:
        logo_pil = _load_and_process_logo(logo, target_w)
        if logo_pil:
            qr_pil = _composite_logo(qr_pil, logo_pil)

    out = io.BytesIO()
    qr_pil.save(out, format="PNG", optimize=True)
    return out.getvalue()


def _load_and_process_logo(logo: bytes, qr_size: int) -> Optional[Image.Image]:
    try:
        logo_img = Image.open(io.BytesIO(logo))
    except Exception as e:
        logger.warning("Failed to open logo image: %s", e)
        return None

    if logo_img.mode not in ("RGBA", "RGB"):
        logo_img = logo_img.convert("RGBA")

    logo_size = int(qr_size * MAX_LOGO_RATIO)
    logo_img.thumbnail((logo_size, logo_size), Image.LANCZOS)

    return logo_img


def _composite_logo(qr_image: Image.Image, logo: Image.Image) -> Image.Image:
    qr_w, qr_h = qr_image.size
    logo_w, logo_h = logo.size

    x = (qr_w - logo_w) // 2
    y = (qr_h - logo_h) // 2

    if qr_image.mode != "RGBA":
        qr_image = qr_image.convert("RGBA")

    logo_rgba = logo if logo.mode == "RGBA" else logo.convert("RGBA")

    padding = int(qr_w * LOGO_MIN_PADDING_RATIO)
    white_block = Image.new("RGBA", (logo_w + 2 * padding, logo_h + 2 * padding), (255, 255, 255, 255))
    px = x - padding
    py = y - padding
    qr_image.paste(white_block, (px, py), white_block)
    qr_image.paste(logo_rgba, (x, y), logo_rgba)

    return qr_image


async def download_logo(url: str) -> Optional[bytes]:
    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code != 200:
                logger.warning("Logo download failed: HTTP %s from %s", resp.status_code, url)
                return None
            content_type = resp.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                logger.warning("Logo URL returned non-image content-type: %s", content_type)
                return None
            body = resp.read()
            if len(body) > LOGO_MAX_DOWNLOAD_BYTES:
                logger.warning("Logo too large: %d bytes", len(body))
                return None
            return body
    except Exception as e:
        logger.warning("Logo download error: %s", e)
        return None
