import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGstin, gstinCheckChar } from './gstin';

// Real, publicly-listed GSTINs (Infosys Limited, from GST search portals).
// If the Mod-36 implementation is right, every one of these validates and
// the computed 15th char matches the published one.
const REAL_GSTINS = ['29AAACI4798L1ZU', '27AAACI4798L2ZX', '29AAACI4798L2ZT', '29AAACI4798L4ZR'];

test('accepts real published GSTINs', () => {
  for (const g of REAL_GSTINS) {
    const r = validateGstin(g);
    assert.equal(r.valid, true, `${g} should be valid: ${r.error ?? ''}`);
    assert.equal(gstinCheckChar(g.slice(0, 14)), g[14], `check char for ${g}`);
  }
});

test('rejects a tampered check digit', () => {
  assert.equal(validateGstin('29AAACI4798L1ZX').valid, false);
});

test('rejects an invalid state code', () => {
  assert.equal(validateGstin('00AAACI4798L1ZU').valid, false);
});

test('rejects a non-Z 14th character', () => {
  assert.equal(validateGstin('29AAACI4798L1YU').valid, false);
});

test('rejects wrong length / non-alphanumeric', () => {
  assert.equal(validateGstin('29AAACI47981L1ZU').valid, false);
  assert.equal(validateGstin('29XX@CI4798L1ZU').valid, false);
});

test('rejects a GSTIN whose chars 3-12 are not a valid PAN', () => {
  assert.equal(validateGstin('2912345I4798L1ZU').valid, false);
});
