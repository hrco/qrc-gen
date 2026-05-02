'use client';

import { useState } from 'react';
import {
  encodeUrl,
  encodeVCard,
  encodeWifi,
  type UrlInput,
  type VCardInput,
  type WifiEncryption,
  type WifiInput,
} from '@/lib/formatters';

export type ContentType = 'url' | 'wifi' | 'vcard';

interface Props {
  onChange: (data: string, type: ContentType) => void;
}

const TABS: Array<{ id: ContentType; label: string }> = [
  { id: 'url', label: 'URL / Text' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'vcard', label: 'vCard' },
];

export function ContentTabs({ onChange }: Props) {
  const [active, setActive] = useState<ContentType>('url');

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-3 py-2 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors ${
              active === t.id
                ? 'border-[var(--hawk)] text-[var(--hawk)]'
                : 'border-transparent text-[var(--muted)] hover:text-white'
            }`}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'url' && <UrlForm onChange={(s) => onChange(s, 'url')} />}
      {active === 'wifi' && <WifiForm onChange={(s) => onChange(s, 'wifi')} />}
      {active === 'vcard' && <VCardForm onChange={(s) => onChange(s, 'vcard')} />}
    </div>
  );
}

function UrlForm({ onChange }: { onChange: (s: string) => void }) {
  const [input, setInput] = useState<UrlInput>({ text: 'https://qrc-gen.vercel.app' });

  const update = (next: UrlInput) => {
    setInput(next);
    onChange(encodeUrl(next));
  };

  return (
    <div>
      <label className="label">URL or any text</label>
      <textarea
        className="field"
        rows={4}
        value={input.text}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="https://example.com or any string"
      />
      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        Encoded as plain text. {input.text.length} chars.
      </p>
    </div>
  );
}

function WifiForm({ onChange }: { onChange: (s: string) => void }) {
  const [input, setInput] = useState<WifiInput>({
    ssid: '',
    password: '',
    encryption: 'WPA',
    hidden: false,
  });

  const update = (next: WifiInput) => {
    setInput(next);
    onChange(encodeWifi(next));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Network name (SSID)</label>
        <input
          className="field"
          value={input.ssid}
          onChange={(e) => update({ ...input, ssid: e.target.value })}
          placeholder="my-home-wifi"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Encryption</label>
          <select
            className="field"
            value={input.encryption}
            onChange={(e) =>
              update({ ...input, encryption: e.target.value as WifiEncryption })
            }
          >
            <option value="WPA">WPA / WPA2 / WPA3</option>
            <option value="WEP">WEP</option>
            <option value="nopass">None (open)</option>
          </select>
        </div>
        <div>
          <label className="label">Hidden network</label>
          <button
            type="button"
            onClick={() => update({ ...input, hidden: !input.hidden })}
            className={`field text-left ${input.hidden ? 'text-[var(--hawk)]' : ''}`}
          >
            {input.hidden ? '● yes' : '○ no'}
          </button>
        </div>
      </div>
      {input.encryption !== 'nopass' && (
        <div>
          <label className="label">Password</label>
          <input
            type="text"
            className="field"
            value={input.password}
            onChange={(e) => update({ ...input, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>
      )}
    </div>
  );
}

function VCardForm({ onChange }: { onChange: (s: string) => void }) {
  const [input, setInput] = useState<VCardInput>({
    firstName: '',
    lastName: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
    url: '',
  });

  const update = (next: VCardInput) => {
    setInput(next);
    onChange(encodeVCard(next));
  };

  const field = <K extends keyof VCardInput>(key: K, label: string, placeholder?: string) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        value={input[key]}
        onChange={(e) => update({ ...input, [key]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field('firstName', 'First name', 'Ada')}
        {field('lastName', 'Last name', 'Lovelace')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('organization', 'Organization', 'Analytical Engine Co.')}
        {field('title', 'Title', 'Mathematician')}
      </div>
      {field('phone', 'Phone', '+1 555 0100')}
      {field('email', 'Email', 'ada@example.com')}
      {field('url', 'Website', 'https://example.com')}
    </div>
  );
}
