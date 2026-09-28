'use client';

import { signOut } from '@/lib/authActions';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-xs font-medium text-ink-faint underline hover:text-navy">
        Sign out
      </button>
    </form>
  );
}
