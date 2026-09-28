import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInferredDocName } from './inferBidderDoc';

test('parses <slug>__<doctype>.pdf at the ZIP root (no tender hint)', () => {
  const r = parseInferredDocName('coromandel-diagnostics__OEM.pdf');
  assert.deepEqual(r, {
    ok: true,
    companySlug: 'coromandel-diagnostics',
    docType: 'OEM_AUTHORIZATION_CERTIFICATE',
    docTypeKeyword: 'OEM',
    tenderReferenceNo: null,
  });
});

test('reads the tender referenceNo from a GEM/... subfolder', () => {
  const r = parseInferredDocName('GEM/2026/B/7801588/coromandel-diagnostics__local-content.pdf');
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.tenderReferenceNo, 'GEM/2026/B/7801588');
  assert.equal(r.companySlug, 'coromandel-diagnostics');
  assert.equal(r.docType, 'LOCAL_CONTENT_CERTIFICATE');
});

test('ignores a wrapper folder that the ZIP tool added', () => {
  const r = parseInferredDocName('bidder-docs/acme-industries__gst.pdf');
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.tenderReferenceNo, null);
  assert.equal(r.companySlug, 'acme-industries');
  assert.equal(r.docType, 'GST_CERTIFICATE');
});

test('keeps the GEM referenceNo even when nested under a wrapper folder', () => {
  const r = parseInferredDocName('export/GEM/2026/B/7801588/acme__udyam.pdf');
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.tenderReferenceNo, 'GEM/2026/B/7801588');
});

test('maps every documented keyword case-insensitively as a substring', () => {
  const cases: [string, string][] = [
    ['acme__OEM.pdf', 'OEM_AUTHORIZATION_CERTIFICATE'],
    ['acme__oem-authorisation-letter.pdf', 'OEM_AUTHORIZATION_CERTIFICATE'],
    ['acme__local.pdf', 'LOCAL_CONTENT_CERTIFICATE'],
    ['acme__LocalContentCert.pdf', 'LOCAL_CONTENT_CERTIFICATE'],
    ['acme__india.pdf', 'LOCAL_CONTENT_CERTIFICATE'],
    ['acme__MII.pdf', 'LOCAL_CONTENT_CERTIFICATE'],
    ['acme__pan.pdf', 'PAN_CARD'],
    ['acme__PAN-card.pdf', 'PAN_CARD'],
    ['acme__gst.pdf', 'GST_CERTIFICATE'],
    ['acme__GST-registration.pdf', 'GST_CERTIFICATE'],
    ['acme__udyam.pdf', 'UDYAM_CERTIFICATE'],
    ['acme__Udyam-MSME.pdf', 'UDYAM_CERTIFICATE'],
    ['acme__epfo.pdf', 'EPFO_ESIC_CHALLAN'],
    ['acme__esic-challan.pdf', 'EPFO_ESIC_CHALLAN'],
    ['acme__startup.pdf', 'STARTUP_INDIA_CERTIFICATE'],
    ['acme__nsic.pdf', 'NSIC_CERTIFICATE'],
    ['acme__digilocker.pdf', 'DIGILOCKER_CERTIFICATE'],
    ['acme__bis-cert.pdf', 'BIS_QUALITY_CERTIFICATE'],
  ];
  for (const [name, docType] of cases) {
    const r = parseInferredDocName(name);
    assert.equal(r.ok, true, `${name} should parse`);
    if (r.ok) assert.equal(r.docType, docType, name);
  }
});

test('lower-cases the company slug', () => {
  const r = parseInferredDocName('Coromandel-Diagnostics__OEM.PDF');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.companySlug, 'coromandel-diagnostics');
});

test('rejects a filename with no "__" separator', () => {
  const r = parseInferredDocName('coromandel-diagnostics-oem.pdf');
  assert.equal(r.ok, false);
});

test('rejects an unrecognised doc-type keyword (never guesses)', () => {
  const r = parseInferredDocName('acme__passport.pdf');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /passport/);
});

test('rejects an empty slug or empty keyword', () => {
  assert.equal(parseInferredDocName('__oem.pdf').ok, false);
  assert.equal(parseInferredDocName('acme__.pdf').ok, false);
});

test('rejects a non-PDF', () => {
  assert.equal(parseInferredDocName('acme__oem.png').ok, false);
  assert.equal(parseInferredDocName('GEM/2026/B/1/acme__gst.docx').ok, false);
});
