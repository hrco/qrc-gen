'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { ContentTabs, type ContentType } from '@/components/ContentTabs';
import { StylePanel } from '@/components/StylePanel';
import { DownloadBar } from '@/components/DownloadBar';
import type { QRPreviewHandle } from '@/components/QRPreview';
import { DEFAULT_CONFIG, type QRConfig } from '@/lib/qr';

const QRPreview = dynamic(
  () => import('@/components/QRPreview').then((m) => m.QRPreview),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-lg border border-[var(--border)] flex items-center justify-center font-mono text-xs text-[var(--muted)]"
        style={{ width: 320, height: 320 }}
      >
        booting matrix…
      </div>
    ),
  },
);

export default function Home() {
  const [config, setConfig] = useState<QRConfig>(DEFAULT_CONFIG);
  const [contentType, setContentType] = useState<ContentType>('url');
  const previewRef = useRef<QRPreviewHandle | null>(null);

  const handleContent = (data: string, type: ContentType) => {
    setConfig((prev) => ({ ...prev, data }));
    setContentType(type);
  };

  const filename = useMemo(() => {
    if (contentType === 'wifi') return 'wifi-qr';
    if (contentType === 'vcard') return 'vcard-qr';
    return 'qrcode';
  }, [contentType]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-lg text-[var(--hawk)] hawk-glow scanline">
              qrc-gen
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mt-1">
              QR codes from the void
            </p>
          </div>
          <a
            href="https://github.com/hrco/qrc-gen"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-[var(--muted)] hover:text-[var(--hawk)] transition-colors"
          >
            github →
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="mb-10">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Generate QR codes.{' '}
            <span className="text-[var(--muted)]">
              No accounts. No tracking. No bullshit.
            </span>
          </h2>
          <p className="mt-3 font-mono text-sm text-[var(--muted)] max-w-2xl">
            Built for URLs, Wi-Fi networks, and contact cards. Drop in a logo or center
            text — error correction auto-bumps so it still scans. PNG and SVG out.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-10">
          <div className="space-y-8">
            <Card title="Content">
              <ContentTabs onChange={handleContent} />
            </Card>

            <Card title="Style">
              <StylePanel config={config} onChange={setConfig} />
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Card title="Preview">
              <QRPreview config={config} ref={previewRef} />
            </Card>

            <Card title="Export">
              <DownloadBar previewRef={previewRef} defaultName={filename} />
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] mt-10">
        <div className="max-w-6xl mx-auto px-6 py-6 font-mono text-xs text-[var(--muted)] flex flex-wrap gap-4 justify-between">
          <span>
            built in the void · open source · vibe by{' '}
            <span className="text-[var(--hawk)]">SpectreHawk</span>
          </span>
          <span>
            powered by{' '}
            <a
              href="https://github.com/kozakdenys/qr-code-styling"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--hawk)] transition-colors"
            >
              qr-code-styling
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4">
        {title}
      </h3>
      {children}
    </section>
  );
}
