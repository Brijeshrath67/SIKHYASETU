/** @vitest-environment node */
import { describe, expect, it } from 'vitest';

import {
  canonicalJson,
  checksumOf,
  sha256Hex,
  verifyPack,
} from '../../shared/services/integrity/canonical';
import seedRaw from '../../shared/content/seed-packs.json';
import type { LessonPack } from '../../shared/types/domain';

const bundle = seedRaw as unknown as { packs: Record<string, LessonPack> };

describe('canonical JSON', () => {
  it('is independent of key order', () => {
    const left = { b: 1, a: { y: 2, x: [3, 4] } };
    const right = { a: { x: [3, 4], y: 2 }, b: 1 };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
  });

  it('rejects floating point numbers', () => {
    expect(() => canonicalJson({ kb: 1.5 })).toThrow(/integer/i);
  });

  it('hashes deterministically', async () => {
    const first = await sha256Hex('ପ୍ରବାହ');
    const second = await sha256Hex('ପ୍ରବାହ');
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });
});

describe('pack integrity (cross-implementation with the Python backend)', () => {
  it('verifies every signed seed pack produced by the server', async () => {
    const packs = Object.values(bundle.packs);
    expect(packs.length).toBeGreaterThan(0);
    for (const pack of packs) {
      expect(await verifyPack(pack)).toBe(true);
    }
  });

  it('detects tampering by changing the checksum', async () => {
    const pack = structuredClone(Object.values(bundle.packs)[0]);
    pack.objectives = ['tampered'];
    expect(await verifyPack(pack)).toBe(false);
    expect(await checksumOf(pack)).not.toBe(pack.integrity.checksum);
  });
});
