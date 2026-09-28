import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePan } from './pan';

test('accepts well-formed PANs and decodes holder type', () => {
  assert.equal(validatePan('AAACI4798L').holderType, 'Company'); // ...I = Company (Infosys PAN pattern)
  assert.equal(validatePan('ABCPK1234Q').holderType, 'Individual');
  assert.equal(validatePan('ABCFK1234Q').holderType, 'Firm / LLP');
});

test('rejects an unrecognised holder-type character', () => {
  const r = validatePan('ABCXK1234Q');
  assert.equal(r.valid, false);
  assert.match(r.error!, /holder type/);
});

test('rejects structural violations', () => {
  assert.equal(validatePan('ABCDE12345').valid, false); // last char must be a letter
  assert.equal(validatePan('AADCN65O3P').valid, false); // letter O where a digit belongs
  assert.equal(validatePan('AAACI4798').valid, false); // too short
});

test('normalises case before validating', () => {
  assert.equal(validatePan('aaaci4798l').valid, true);
});
