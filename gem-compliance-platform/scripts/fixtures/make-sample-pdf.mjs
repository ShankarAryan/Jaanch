/**
 * Regenerates the sample PDFs used to demo / test multimodal document
 * extraction:
 *   - sample-local-content-certificate.pdf
 *   - sample-oem-authorization-letter.pdf
 * Run: node scripts/fixtures/make-sample-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

function makePdf(lines) {
  const esc = (s) => s.replace(/([()\\])/g, '\\$1');
  const body = ['BT', '/F1 12 Tf', '50 750 Td', '15 TL', ...lines.map((l) => `(${esc(l)}) Tj T*`), 'ET'].join('\n');
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
    `<</Length ${Buffer.byteLength(body)}>>\nstream\n${body}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

const write = (name, lines) => {
  const out = path.join(here, name);
  fs.writeFileSync(out, makePdf(lines));
  console.log(`wrote ${out}`);
};

write('sample-local-content-certificate.pdf', [
  'LOCAL CONTENT CERTIFICATE',
  '',
  'This is to certify that the goods offered under bid',
  'GEM/2026/B/7801588 contain 78% local content as computed per the',
  'Public Procurement (Make in India) Order 2017 and the DPIIT',
  'guidelines thereunder.',
  '',
  'Certified by: Meenakshi Sundaram & Co, DPIIT-registered Cost Accountants.',
  'Membership No. 30214  |  Date: 12 August 2026',
]);

write('sample-oem-authorization-letter.pdf', [
  'OEM AUTHORIZATION LETTER',
  '',
  'Ref: OEM/AUTH/2026/1184                              Date: 25 August 2026',
  '',
  'To: The Procurement Officer, C-DAC Thiruvananthapuram',
  'Sub: Authorization to bid - GeM/2026/B/7983771 (Cyber Forensic',
  '     Hardware and Software)',
  '',
  'We, Falcon Forensics Instruments GmbH, the Original Equipment',
  'Manufacturer of the FX-series forensic acquisition hardware, hereby',
  'authorise M/s Chennai Precision Engineering Pvt Ltd to quote for,',
  'supply, install and provide warranty support for our products against',
  'the above tender.',
  '',
  'This authorization is valid for the tender period and any resulting',
  'contract.',
  '',
  'For Falcon Forensics Instruments GmbH',
  'Authorised Signatory - Global Channel Sales',
]);

// A stand-in GeM bid document for the /admin/import tool test. The real
// organizer PDFs are not in this repo; the field values below match
// prisma/seed.ts tender 1 (GEM/2026/B/7983771) verbatim so extraction can be
// checked against the seed.
write('sample-tender-GEM-2026-B-7983771.pdf', [
  'GOVERNMENT E-MARKETPLACE (GeM) - BID DOCUMENT',
  '',
  'Bid Number / RFP No: GEM/2026/B/7983771',
  'Dated: 03-09-2026',
  '',
  'Item / Work Title: Cyber Forensic Hardware and Software',
  'Ministry/Department: Ministry of Electronics & IT - Department of',
  '   Electronics and Information Technology',
  'Organisation Name: Centre for Development of Advanced Computing',
  '   (C-DAC), Thiruvananthapuram',
  'Bid Category: Global Tender - GlobalTenderCategory (Q3)',
  '',
  'Bid End Date/Time: 08-09-2026 17:00:00',
  'Bid Opening Date/Time: 08-09-2026 17:30:00',
  '',
  'EMD: Not required. ePBG 5% of contract value, valid 14 months',
  '   (State Bank of India).',
  '',
  'MSE Purchase Preference: Yes - MSE OEMs / Service Providers get',
  '   preference up to price within L1+15%, for up to 25% of bid quantity.',
  '   Startups (DPIIT-registered) are relaxed from the experience criteria.',
  '',
  'Make in India Purchase Preference: NOT opted. Competent Authority',
  '   (Dr. Parameswaran Nampoothiri V, Section Head Purchase, C-DAC)',
  '   approved a Global Tender on 01-09-2026 - the tendered items are not',
  '   available domestically. CA Approval CDAC/CFSPR291/16714.',
]);
