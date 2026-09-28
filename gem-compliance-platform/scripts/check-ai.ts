/**
 * Verifies the configured LLM provider (Gemini or Claude) actually works,
 * end to end, for the things the app uses it for:
 *   1. text extraction        (extractLocalContentCertificate)
 *   2. local-content PDF       (extractLocalContentCertificateFromFile)
 *   3. OEM-letter PDF          (extractOemAuthorizationFromFile)
 *   4. recommendation text     (generateRecommendation)
 *
 * Run after setting GEMINI_API_KEY (or ANTHROPIC_API_KEY) in .env.local:
 *   npm run ai:check
 *
 * Exit code 0 = the provider is working; non-zero = at least one call failed
 * (the app still runs on deterministic fallbacks either way).
 */
import fs from 'fs';
import path from 'path';

// Load .env.local (tsx doesn't do this automatically; Prisma only loads .env).
for (const file of ['.env', '.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trimStart().startsWith('#')) continue;
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

async function main() {
  const { llmProvider } = await import('../src/lib/ai/llm');
  const { extractLocalContentCertificate, extractLocalContentCertificateFromFile, extractOemAuthorizationFromFile } =
    await import('../src/lib/ai/documentExtraction');
  const { generateRecommendation } = await import('../src/lib/ai/recommendation');

  const provider = llmProvider();
  console.log(`provider: ${provider}${provider === 'none' ? '  (no key set - everything will use fallbacks)' : ''}\n`);

  let failures = 0;
  const check = (name: string, ok: boolean, detail: string) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ->  ${detail}`);
    if (!ok) failures++;
  };

  // 1. text
  const t = await extractLocalContentCertificate(
    'Local Content Certificate: goods offered contain 63% local content per Make in India guidelines, certified by Anbu & Associates, DPIIT registered chartered accountants.',
  );
  check('text extraction', t.localContentPercent === 63, JSON.stringify(t));

  // 2. PDF
  const pdf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-local-content-certificate.pdf'));
  const p = await extractLocalContentCertificateFromFile(pdf.toString('base64'), 'application/pdf');
  check(
    'PDF extraction',
    provider === 'none' ? p.localContentPercent === null : p.localContentPercent === 78,
    `${JSON.stringify(p)} ${provider === 'none' ? '(expected null - no provider)' : '(expected 78)'}`,
  );

  // 3. OEM authorization letter — plausibility + name extraction
  const oemPdf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-oem-authorization-letter.pdf'));
  const oem = await extractOemAuthorizationFromFile(oemPdf.toString('base64'), 'application/pdf');
  check(
    'OEM letter extraction',
    provider === 'none'
      ? oem.looksLikeOemAuthLetter === null
      : oem.looksLikeOemAuthLetter === true && /chennai precision/i.test(oem.authorizedBidderName ?? ''),
    `${JSON.stringify(oem)}`,
  );

  // 4. recommendation
  const r = await generateRecommendation({
    bidderName: 'Coastal Traders & Co',
    complianceScore: 62,
    riskLevel: 'HIGH',
    evaluations: [
      { code: 'GST_FILING', label: 'GST Filing', mandatory: true, sourceType: 'gst', outcome: 'NOT_MET', reason: 'returns 5 months behind' },
      { code: 'UDYAM_STATUS', label: 'Udyam Status', mandatory: true, sourceType: 'udyam', outcome: 'NOT_MET', reason: 'not supplied' },
    ] as never,
  });
  const looksGenerated = provider !== 'none' && !r.startsWith('Coastal Traders & Co scored 62/100');
  check('recommendation', provider === 'none' ? true : looksGenerated, `${r.slice(0, 80)}...`);

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('check-ai crashed:', e);
  process.exit(1);
});
