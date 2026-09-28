import { Hanken_Grotesk } from 'next/font/google';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { setSessionCookie } from '@/lib/authActions';
import { STAFF_CREDENTIALS, findStaff } from '@/lib/authConfig';
import { newCaptcha } from '@/lib/captcha';
import { SignInForm } from '@/components/SignInForm';
import { ShieldCheckIcon, BankIcon, ClipboardIcon, FileIcon, LinkIcon } from '@/components/icons';
import { GemIcon, GemFullLogo } from '@/components/GemLogo';

export const dynamic = 'force-dynamic';

const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });

const VERIFIED_CHECKS = [
  { icon: BankIcon, label: 'GST Registration & Return Filing', mandatory: true },
  { icon: ClipboardIcon, label: 'PAN Validity', mandatory: true },
  { icon: ShieldCheckIcon, label: 'Blacklisting / Debarment Check', mandatory: true },
  { icon: FileIcon, label: 'EPFO / ESIC & Labour Code Compliance', mandatory: false },
  { icon: LinkIcon, label: 'DigiLocker Document Verification', mandatory: false },
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { demo?: string; force?: string; role?: string };
}) {
  if (getSession()) redirect('/dashboard');

  if (searchParams?.demo === 'true' || searchParams?.force === 'true' || searchParams?.demo === '1' || searchParams?.force === '1') {
    const roleParam = searchParams.role === 'viewer' ? '?role=viewer' : '';
    redirect(`/demo-login${roleParam}`);
  }

  const { token, svg } = newCaptcha();


  return (
    <div className={`${hanken.className} mx-auto grid w-full max-w-6xl grid-cols-1 md:grid-cols-2 items-center gap-10 lg:gap-16 py-2`}>
      {/* ---- Left side: Hero / what-this-verifies panel ---- */}
      <div className="flex flex-col justify-center">
        {/* Official GeM Logo prominently displayed */}
        <div className="mb-5">
          <GemFullLogo size="lg" showEmblem={true} />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-navy/5 px-3.5 py-1 text-xs uppercase tracking-wider text-navy w-fit font-medium border border-navy/10">
          <GemIcon className="h-4 w-4 shrink-0" />
          Government e-Marketplace · Procurement Officer Console
        </div>

        <h1 className="mt-3.5 font-heading text-3xl lg:text-4xl font-bold text-navy leading-tight">
          Bid Compliance Verification
        </h1>
        <p className="mt-2 max-w-lg text-sm sm:text-base text-ink-muted leading-relaxed">
          A single sign-in for the tools that check a GeM bidder&apos;s statutory documents, score their compliance,
          and keep an audit trail of every decision.
        </p>

        <ul className="mt-5 space-y-2.5">
          {VERIFIED_CHECKS.map(({ icon: Icon, label, mandatory }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-ink">{label}</span>
              <span className={`badge ${mandatory ? 'badge-warning' : 'badge-neutral'} shrink-0 text-xs py-0.5 px-2 font-medium`}>
                {mandatory ? 'Mandatory' : 'Where applicable'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ---- Right side: Sign-in card ---- */}
      <div>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-lowest shadow-lg">
          {/* Tiranga-toned accent strip */}
          <div
            className="h-2 w-full"
            style={{ background: 'linear-gradient(90deg, #FF9933 0%, #D4AF37 50%, #138808 100%)' }}
            aria-hidden="true"
          />

          {/* Faint watermark — decorative only */}
          <GemIcon className="pointer-events-none absolute -right-12 -top-8 h-48 w-48 opacity-[0.06] select-none" />

          <div className="relative p-6 sm:p-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Restricted access</span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold text-navy">Sign in</h2>
            <p className="mb-5 mt-1 text-sm text-ink-muted">GeM Bid Compliance Verification Portal.</p>
            <SignInForm captchaSvg={svg} captchaToken={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
