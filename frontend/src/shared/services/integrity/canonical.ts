/**
 * Canonical JSON + SHA-256, mirroring backend/app/domain/services/integrity.py
 * exactly so a pack signed on the server verifies in the browser.
 *
 * Rules: object keys sorted recursively, no whitespace, Unicode left intact.
 * Floats are rejected: packs use integers in minor units (KB, minutes).
 */

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function assertNoFloat(value: number, path: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`Non-integer number at ${path}: packs must use integers only`);
  }
}

function canonicalize(value: unknown, path: string): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      assertNoFloat(value, path);
      return String(value);
    case 'string':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map((item, i) => canonicalize(item, `${path}[${i}]`)).join(',')}]`;
      }
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      const body = entries
        .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v, `${path}.${k}`)}`)
        .join(',');
      return `{${body}}`;
    }
    default:
      throw new Error(`Unsupported type at ${path}: ${typeof value}`);
  }
}

export function canonicalJson(value: unknown): string {
  return canonicalize(value, '$');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}

export function stripIntegrity<T extends { integrity?: unknown }>(pack: T): Omit<T, 'integrity'> {
  const { integrity: _integrity, ...rest } = pack;
  return rest;
}

export async function checksumOf(pack: { integrity?: unknown }): Promise<string> {
  return sha256Hex(canonicalJson(stripIntegrity(pack)));
}

export async function verifyPack(pack: { integrity?: { checksum?: string } }): Promise<boolean> {
  const expected = pack.integrity?.checksum;
  if (!expected) return false;
  return (await checksumOf(pack)) === expected;
}
