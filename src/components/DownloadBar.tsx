'use client';

import { useState } from 'react';
import type { QRPreviewHandle } from './QRPreview';

interface Props {
  previewRef: React.RefObject<QRPreviewHandle | null>;
  defaultName?: string;
}

export function DownloadBar({ previewRef, defaultName = 'qrcode' }: Props) {
  const [name, setName] = useState(defaultName);

  const safe = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '-') || 'qrcode';

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
      <div className="flex-1">
        <label className="label">Filename</label>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="qrcode"
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => previewRef.current?.download('png', safe)}
      >
        ↓ PNG
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => previewRef.current?.download('svg', safe)}
      >
        ↓ SVG
      </button>
    </div>
  );
}
