/**
 * Encoders that turn typed form input into the string that goes inside the QR.
 * These are the boundary between UI state and the generic QR engine — pure,
 * no side-effects, no DOM. The QR scanner on the receiving end (a phone camera)
 * recognizes these formats by their well-known prefixes (WIFI:, BEGIN:VCARD).
 */

export interface UrlInput {
  text: string;
}

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface WifiInput {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}

export interface VCardInput {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  url: string;
}

export function encodeUrl(input: UrlInput): string {
  return input.text;
}

/**
 * Wi-Fi network QR format (the de-facto standard, supported by iOS 11+ and
 * recent Android camera apps):
 *
 *   WIFI:T:<encryption>;S:<ssid>;P:<password>;H:<true|false>;;
 *
 * Special characters in SSID/password (`\`, `;`, `,`, `:`, `"`) MUST be
 * backslash-escaped or the string will be parsed wrong on some devices.
 */
export function encodeWifi(input: WifiInput): string {
  const t = input.encryption === 'nopass' ? 'nopass' : input.encryption;
  const s = escapeWifi(input.ssid);
  const p = input.encryption === 'nopass' ? '' : escapeWifi(input.password);
  const h = input.hidden ? 'true' : 'false';
  return `WIFI:T:${t};S:${s};P:${p};H:${h};;`;
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/**
 * vCard 3.0 — most broadly compatible (iOS Contacts and Android both import
 * cleanly). Uses CRLF line endings per RFC 2426. Empty fields are dropped to
 * keep the payload small and the QR less dense.
 */
export function encodeVCard(input: VCardInput): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

  const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
  if (fullName) {
    lines.push(`FN:${escapeVCard(fullName)}`);
    lines.push(`N:${escapeVCard(input.lastName)};${escapeVCard(input.firstName)};;;`);
  }
  if (input.organization) lines.push(`ORG:${escapeVCard(input.organization)}`);
  if (input.title) lines.push(`TITLE:${escapeVCard(input.title)}`);
  if (input.phone) lines.push(`TEL;TYPE=CELL:${input.phone.replace(/[^+0-9]/g, '')}`);
  if (input.email) lines.push(`EMAIL:${escapeVCard(input.email)}`);
  if (input.url) lines.push(`URL:${escapeVCard(input.url)}`);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function escapeVCard(value: string): string {
  return value.replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');
}
