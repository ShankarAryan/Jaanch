import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { encodeSession, SESSION_COOKIE } from '@/lib/session';
import { STAFF_CREDENTIALS, findStaff } from '@/lib/authConfig';

export const dynamic = 'force-dynamic';

/**
 * 1-Time Demo Force Login Route.
 * Navigating to /demo-login automatically signs the user in as Procurement Officer
 * (or ?role=viewer for Audit Desk) and redirects straight to /dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetRole = searchParams.get('role') === 'viewer' ? 'viewer' : 'officer';
  const cred = findStaff(targetRole) ?? STAFF_CREDENTIALS[0];

  cookies().set(SESSION_COOKIE, encodeSession({ name: cred.name, role: cred.role }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const redirectOrigin = host ? `${proto}://${host}` : request.url;
  const dashboardUrl = new URL('/dashboard', redirectOrigin);
  return NextResponse.redirect(dashboardUrl);
}
