import type { Options } from 'qr-code-styling';

export type DotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
export type CornerSquareStyle = 'square' | 'dot' | 'extra-rounded';
export type CornerDotStyle = 'square' | 'dot';

export type Overlay =
  | { kind: 'none' }
  | { kind: 'image'; src: string }
  | { kind: 'text'; text: string };

export interface QRConfig {
  data: string;
  size: number;
  fgColor: string;
  bgColor: string;
  dotStyle: DotStyle;
  cornerSquareStyle: CornerSquareStyle;
  cornerDotStyle: CornerDotStyle;
  overlay: Overlay;
}

export const DEFAULT_CONFIG: QRConfig = {
  data: 'https://qrc-gen.vercel.app',
  size: 320,
  fgColor: '#39FF7A',
  bgColor: '#0A0A0A',
  dotStyle: 'rounded',
  cornerSquareStyle: 'extra-rounded',
  cornerDotStyle: 'dot',
  overlay: { kind: 'none' },
};

/**
 * Map our config to qr-code-styling's Options.
 *
 * Auto-bumps error correction to 'H' when an overlay is present so the
 * ~20% center occlusion stays scannable. Without an overlay we use 'M'
 * (the standard default — denser, fits more data).
 */
export function buildOptions(config: QRConfig, image?: string): Options {
  const hasOverlay = config.overlay.kind !== 'none';

  return {
    width: config.size,
    height: config.size,
    type: 'canvas',
    data: config.data || ' ',
    image,
    qrOptions: {
      errorCorrectionLevel: hasOverlay ? 'H' : 'M',
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.35,
      margin: 6,
      crossOrigin: 'anonymous',
    },
    dotsOptions: {
      color: config.fgColor,
      type: config.dotStyle,
    },
    backgroundOptions: {
      color: config.bgColor,
    },
    cornersSquareOptions: {
      color: config.fgColor,
      type: config.cornerSquareStyle,
    },
    cornersDotOptions: {
      color: config.fgColor,
      type: config.cornerDotStyle,
    },
  };
}

/**
 * Render short text as a data-URL PNG so it can be passed as the `image`
 * option to qr-code-styling. Used for the "text in the middle" overlay.
 *
 * Browser-only — uses canvas. Safe to call in useEffect / event handlers.
 */
export function textToImage(
  text: string,
  fgColor: string,
  bgColor: string,
): string {
  const trimmed = text.trim().slice(0, 6);
  if (!trimmed) return '';

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const size = 200;
  const canvas = document.createElement('canvas');
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(dpr, dpr);

  const pad = 14;
  const radius = 24;
  ctx.fillStyle = bgColor;
  roundedRect(ctx, pad, pad, size - pad * 2, size - pad * 2, radius);
  ctx.fill();

  ctx.fillStyle = fgColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = trimmed.length <= 2 ? 110 : trimmed.length <= 4 ? 70 : 48;
  ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(trimmed, size / 2, size / 2 + 4);

  return canvas.toDataURL('image/png');
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
