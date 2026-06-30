import io
import ipaddress
import logging
import re
import socket
from typing import Optional
from urllib.parse import urlparse

import segno
from PIL import Image

logger = logging.getLogger(__name__)

MAX_LOGO_RATIO = 0.22
LOGO_MIN_PADDING_RATIO = 0.04
LOGO_MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024

_ALLOWED_SCHEMES = {"http", "https"}


def _validate_logo_url(url: str) -> bool:
    """SSRF guard: reject URLs that resolve to private/internal addresses.

    Checks before the HTTP request is issued:
    - Scheme must be http or https.
    - Hostname must resolve via DNS.
    - Every resolved IP must be a routable public address (not private,
      loopback, link-local, reserved, multicast, or unspecified).

    Why: the /qr logo param is user-supplied. Without validation an attacker
    can reach cloud metadata (169.254.169.254), loopback, or co-tenant hosts.
    Residual TOCTOU gap (DNS rebinding) is mitigated by follow_redirects=False
    and not following HTTP redirects to validate again.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in _ALLOWED_SCHEMES:
            logger.warning("SSRF guard: rejected scheme %r for logo URL", parsed.scheme)
            return False

        hostname = parsed.hostname
        if not hostname:
            logger.warning("SSRF guard: no hostname in logo URL")
            return False

        try:
            addr_infos = socket.getaddrinfo(hostname, None)
        except socket.gaierror as e:
            logger.warning("SSRF guard: DNS resolution failed for %r: %s", hostname, e)
            return False

        if not addr_infos:
            logger.warning("SSRF guard: no addresses for %r", hostname)
            return False

        for _family, _type, _proto, _canonname, sockaddr in addr_infos:
            ip_str = sockaddr[0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                logger.warning("SSRF guard: invalid IP %r resolved for %r", ip_str, hostname)
                return False
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            ):
                logger.warning(
                    "SSRF guard: blocked internal IP %s (resolved from %r)", ip, hostname
                )
                return False

        return True
    except Exception as e:
        logger.warning("SSRF guard: unexpected error validating URL: %s", e)
        return False


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

    # SSRF guard: validate before issuing any network request.
    if not _validate_logo_url(url):
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            # Stream response so we can enforce the size cap during download,
            # not just after — avoids loading a huge body into memory first.
            async with client.stream("GET", url) as resp:
                if resp.status_code != 200:
                    logger.warning(
                        "Logo download failed: HTTP %s from %s", resp.status_code, url
                    )
                    return None
                content_type = resp.headers.get("content-type", "")
                if not content_type.startswith("image/"):
                    logger.warning(
                        "Logo URL returned non-image content-type: %s", content_type
                    )
                    return None
                chunks: list[bytes] = []
                total = 0
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    total += len(chunk)
                    if total > LOGO_MAX_DOWNLOAD_BYTES:
                        logger.warning(
                            "Logo download aborted: exceeded %d bytes limit",
                            LOGO_MAX_DOWNLOAD_BYTES,
                        )
                        return None
                    chunks.append(chunk)
                return b"".join(chunks)
    except Exception as e:
        logger.warning("Logo download error: %s", e)
        return None
