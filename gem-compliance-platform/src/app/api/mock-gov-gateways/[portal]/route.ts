import { NextResponse } from 'next/server';

/**
 * Built-in Government API Simulator Route.
 * Allows evaluators and students to test live HTTP API gateway integration
 * locally or over the network.
 */
export async function POST(
  req: Request,
  { params }: { params: { portal: string } }
) {
  const portal = params.portal;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Simulate network processing delay (25ms - 60ms)
  await new Promise((resolve) => setTimeout(resolve, 35));

  if (portal === 'gst') {
    const gstin = body.gstin;
    return NextResponse.json({
      portal: 'GSTN Goods & Services Tax Network',
      endpoint: '/api/mock-gov-gateways/gst',
      gstin: gstin || 'DECLARED-GSTIN',
      legalName: body.name || 'Verified Participating Bidder',
      status: 'Active',
      taxpayerType: 'Regular',
      lastGstr3bFiled: '2026-08-20',
      lastGstr1Filed: '2026-08-11',
      complianceRating: 9.8,
      verifiedBy: 'National GSTN Production API Bridge',
      verifiedAt: new Date().toISOString(),
    });
  }

  if (portal === 'pan') {
    const pan = body.pan;
    return NextResponse.json({
      portal: 'Income Tax Department (NSDL/UTIITSL)',
      endpoint: '/api/mock-gov-gateways/pan',
      pan: pan || 'DECLARED-PAN',
      holderName: body.name || 'Verified Participating Bidder',
      status: 'VALID_AND_ACTIVE',
      aadhaarSeedingStatus: 'LINKED',
      itrFilingStatusAy2025_26: 'FILED_ON_TIME',
      verifiedAt: new Date().toISOString(),
    });
  }

  if (portal === 'udyam') {
    return NextResponse.json({
      portal: 'Ministry of Micro, Small and Medium Enterprises',
      endpoint: '/api/mock-gov-gateways/udyam',
      udyamNumber: body.udyamNumber || 'DECLARED-UDYAM',
      enterpriseName: body.name || 'Verified MSME Enterprise',
      classification: 'MICRO',
      majorActivity: 'MANUFACTURING',
      nic2Digit: '26 - Manufacture of computer, electronic and optical products',
      validUntil: 'PERPETUAL',
      verifiedAt: new Date().toISOString(),
    });
  }

  if (portal === 'blacklist') {
    return NextResponse.json({
      portal: 'Central Vigilance Commission (CVC) Debarment List',
      endpoint: '/api/mock-gov-gateways/blacklist',
      debarred: false,
      status: 'CLEARED_NOT_BLACKLISTED',
      scrutinizedAgencies: ['GeM', 'CVC', 'Ministry of Finance', 'CPWD', 'MoPNG'],
      verifiedAt: new Date().toISOString(),
    });
  }

  // Generic portal response
  return NextResponse.json({
    portal: `Government Gateway: ${portal}`,
    verified: true,
    status: 'VERIFIED_OK',
    receivedPayload: body,
    verifiedAt: new Date().toISOString(),
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { portal: string } }
) {
  return NextResponse.json({
    status: 'HEALTHY',
    portal: params.portal,
    service: 'GeM Live Government Portal Gateway Sandbox',
    timestamp: new Date().toISOString(),
  });
}
