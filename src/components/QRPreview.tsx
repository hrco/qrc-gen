'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { buildOptions, textToImage, type QRConfig } from '@/lib/qr';

export interface QRPreviewHandle {
  download: (extension: 'png' | 'svg', filename: string) => void;
}

interface Props {
  config: QRConfig;
}

export const QRPreview = forwardRef<QRPreviewHandle, Props>(function QRPreview(
  { config },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const overlayImage =
      config.overlay.kind === 'image'
        ? config.overlay.src
        : config.overlay.kind === 'text'
        ? textToImage(config.overlay.text, config.fgColor, config.bgColor)
        : undefined;

    const options = buildOptions(config, overlayImage || undefined);

    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options);
      if (containerRef.current) {
        containerRef.current.replaceChildren();
        qrRef.current.append(containerRef.current);
      }
    } else {
      qrRef.current.update(options);
    }
  }, [config]);

  useImperativeHandle(ref, () => ({
    download(extension, filename) {
      if (!qrRef.current) return;
      qrRef.current.download({ name: filename, extension });
    },
  }));

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-[var(--border)] shadow-[0_0_40px_rgba(57,255,122,0.08)]"
        style={{ width: config.size, height: config.size, background: config.bgColor }}
      />
    </div>
  );
});
