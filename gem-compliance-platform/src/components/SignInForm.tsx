'use client';

import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, demoForceLogin, type SignInState } from '@/lib/authActions';
import { LockIcon, RefreshIcon, UserIcon } from '@/components/icons';

const INITIAL: SignInState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 text-sm font-semibold">
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

function DemoSubmitButton({
  role = 'officer',
  label,
  className,
}: {
  role?: 'officer' | 'viewer';
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={demoForceLogin}
      formNoValidate
      name="demoRole"
      value={role}
      disabled={pending}
      className={
        className ??
        'w-full py-2.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-400 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]'
      }
    >
      <span className="text-amber-600 font-bold">⚡</span>
      <span>{pending ? 'Logging in…' : label}</span>
    </button>
  );
}

export function SignInForm({ captchaSvg, captchaToken }: { captchaSvg: string; captchaToken: string }) {
  const [state, formAction] = useFormState(signIn, INITIAL);
  const router = useRouter();

  return (
    <form action={formAction} className="space-y-4">

      <div>
        <label className="block text-xs font-medium text-ink-muted">Officer / Viewer ID</label>
        <div className="relative mt-1">
          <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy" />
          <input
            name="username"
            required
            autoFocus
            defaultValue="officer"
            autoComplete="username"
            spellCheck={false}
            className="field pl-9 py-2 text-sm"
            placeholder="officer"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted">Password</label>
        <div className="relative mt-1">
          <LockIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy" />
          <input
            name="password"
            type="password"
            required
            defaultValue="Officer@2026"
            autoComplete="current-password"
            className="field pl-9 py-2 text-sm font-mono"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted">Type the characters shown</label>
        <div className="mt-1.5 flex items-center gap-3 rounded-md border border-line bg-surface-container p-2">
          <span
            className="shrink-0 overflow-hidden rounded border border-line bg-white"
            // Server-rendered SVG from a fixed alphabet - no user input in it.
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-ghost shrink-0 text-xs gap-1 py-1 px-2.5"
            title="Load a new image"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            New image
          </button>
        </div>
        <input type="hidden" name="captchaToken" value={captchaToken} />
        <input
          name="captcha"
          required
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          className="field mt-2 py-2 font-mono uppercase tracking-[0.3em] text-sm text-center font-bold"
          placeholder="CAPTCHA"
        />
      </div>

      {state.status === 'error' && (
        <p className="rounded-md border border-critical/30 bg-critical/5 px-3 py-2 text-xs text-critical">{state.message}</p>
      )}
      <SubmitButton />

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface-lowest px-2.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            ⚡ Quick Demo Force Login
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <DemoSubmitButton
          role="officer"
          label="1-Click Demo Force Login (Officer · K. Shankar Aryan)"
          className="w-full py-2.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/40 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.99]"
        />
        <DemoSubmitButton
          role="viewer"
          label="Demo as Audit Desk (Viewer · Read-Only)"
          className="w-full py-1.5 px-2 rounded-md bg-surface-container hover:bg-surface-subtle text-ink-muted hover:text-ink font-medium text-[11px] border border-line transition-all flex items-center justify-center gap-1.5"
        />
      </div>

      <p className="text-xs leading-normal text-ink-faint">
        Access is restricted to authorised procurement staff. Every recorded decision and uploaded document is tied to
        the signed-in identity for the audit trail.
      </p>
    </form>
  );
}
