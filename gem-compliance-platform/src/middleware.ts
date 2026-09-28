import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Keep in sync with SESSION_COOKIE in src/lib/session.ts (middleware runs on
// the Edge runtime and can't import that module's node:crypto dependency).
const SESSION_COOKIE = 'gem_session';
// /admin/import is the backstage dataset-import tool - deliberately outside the
// officer/viewer/bidder session model, gated by its own ADMIN_IMPORT_SECRET.
// /api/auto-import/* backs that same tool's live status panel and is gated by
// the same secret, so it's out of the session gate too.
const PUBLIC_PATHS = ['/sign-in', '/admin', '/api', '/demo-login', '/flowchart-preview.html', '/tech-icons-showcase.html'];

/**
 * Gate: an unauthenticated visitor loading a page is sent to /sign-in. This
 * only checks for the presence of the session cookie - the signature is
 * verified and the role enforced server-side in every action that mutates
 * anything (runVerification / uploadDocument / recordDecision), so a forged
 * or missing cookie gets past this redirect but not past those.
 *
 * Only GET navigations are redirected. Server Actions POST to the page URL
 * they were invoked from; a `SameSite=Lax` session cookie is withheld on a
 * top-level POST, so redirecting those here would bounce a legitimately
 * signed-in user to /sign-in. The actions authenticate themselves, so we let
 * every non-GET request through and let the action decide.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method !== 'GET') return NextResponse.next();

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static asset files (icons, images, html).
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)'],
};
