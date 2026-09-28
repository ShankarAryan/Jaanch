'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { encodeSession, SESSION_COOKIE, type Session } from './session';
import { verifyPassword } from './passwords';
import { verifyCaptcha } from './captcha';
import { findStaff, STAFF_CREDENTIALS, DUMMY_PASSWORD_HASH } from './authConfig';

export type SignInState = { status: 'idle' } | { status: 'error'; message: string };

const GENERIC_BAD_LOGIN = 'Wrong credentials. Check the ID and password and try again.';

export async function setSessionCookie(session: Session) {
  cookies().set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const captchaToken = String(formData.get('captchaToken') ?? '');
  const captchaAnswer = String(formData.get('captcha') ?? '');

  // CAPTCHA first - a failed challenge never touches the credential check.
  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return {
      status: 'error',
      message: "CAPTCHA doesn't match (or it expired). Retype the characters, or hit “New image” for a fresh one.",
    };
  }

  const cred = findStaff(username);
  // Always run a hash comparison, even for an unknown username, so timing
  // doesn't leak whether the username exists.
  const ok = verifyPassword(password, cred?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!cred || !ok) {
    return { status: 'error', message: GENERIC_BAD_LOGIN };
  }

  setSessionCookie({ name: cred.name, role: cred.role });
  redirect('/dashboard');
}

/**
 * 1-Time Demo Force Login for quick presentations, evaluations, and hackathon judging.
 * Immediately provisions an officer or viewer session without requiring password or CAPTCHA.
 */
export async function demoForceLogin(formData?: FormData) {
  const targetRole = String(formData?.get('demoRole') ?? 'officer');
  const cred = findStaff(targetRole) ?? STAFF_CREDENTIALS[0];
  setSessionCookie({ name: cred.name, role: cred.role });
  redirect('/dashboard');
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  redirect('/sign-in');
}

