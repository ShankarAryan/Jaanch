'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GridIcon,
  LayersIcon,
  BriefcaseIcon,
  ScaleIcon,
  TimelineIcon,
  BarChartIcon,
  ScanIcon,
  NetworkIcon,
} from '@/components/icons';
import { GemIcon } from '@/components/GemLogo';
import type { Role } from '@/lib/session';

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  roles?: Role[]; // undefined = all roles
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'CORE MODULES',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <GridIcon /> },
      { href: '/tenders', label: 'Tenders', badge: '10', icon: <LayersIcon /> },
      { href: '/bidders', label: 'Bidders Directory', badge: '37', icon: <BriefcaseIcon /> },
    ],
  },
  {
    title: 'COMPLIANCE & AUDIT',
    items: [
      { href: '/ocr', label: 'Document OCR', badge: 'AI', icon: <ScanIcon /> },
      { href: '/compliance-rules', label: 'Statutory Rules', icon: <ScaleIcon /> },
      { href: '/audit-logs', label: 'Audit Trail', icon: <TimelineIcon />, roles: ['officer', 'viewer'] },
      { href: '/analytics', label: 'Analytics', icon: <BarChartIcon />, roles: ['officer', 'viewer'] },
      { href: '/admin/api-gateway', label: 'Gov API Gateway', badge: 'Live', icon: <NetworkIcon />, roles: ['officer', 'viewer'] },
    ],
  },
];

export function Sidebar({
  role,
  bidderCount,
  tenderCount,
}: {
  role: Role;
  bidderCount?: number;
  tenderCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface-lowest md:flex h-full select-none">
      {/* Brand header */}
      <div className="shrink-0 border-b border-line px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <GemIcon className="h-7 w-7 shrink-0" />
          <div className="leading-tight">
            <p className="font-heading text-lg font-bold leading-none text-navy">GeM</p>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">Compliance Portal</p>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">Procurement verification terminal</p>
      </div>

      {/* Grouped navigation items */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {SECTIONS.map((section, sIdx) => {
          const visibleItems = section.items.filter((n) => !n.roles || n.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx}>
              {section.title && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  {section.title}
                </p>
              )}
              <nav className="space-y-0.5">
                {visibleItems.map((n) => {
                  const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(`${n.href}/`));
                  let badge = n.badge;
                  if (n.href === '/bidders') {
                    badge = bidderCount !== undefined ? String(bidderCount) : undefined;
                  } else if (n.href === '/tenders') {
                    badge = tenderCount !== undefined ? String(tenderCount) : n.badge;
                  }

                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      prefetch={true}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
                        active
                          ? 'bg-saffron/10 font-semibold text-saffron-800 border-l-2 border-saffron'
                          : 'font-medium text-ink-muted hover:bg-surface-low hover:text-navy border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`shrink-0 ${active ? 'text-saffron-800' : 'text-ink-faint'}`}>
                          {n.icon}
                        </span>
                        <span className="truncate">{n.label}</span>
                      </div>
                      {badge !== undefined && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono leading-none ${
                            active
                              ? 'bg-saffron text-white'
                              : 'bg-surface-high text-ink-muted'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Terminal Node & Status card at bottom */}
      <div className="shrink-0 border-t border-line p-3 bg-surface-lowest">
        <div className="rounded border border-line/70 bg-surface-low/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Portal Node</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indiagreen-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indiagreen animate-pulse" />
              Online
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono font-medium text-navy truncate">CPCL · SIH26100</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint border-t border-line/40 pt-1.5">
            <span>AI: Gemini Vision</span>
            <span className="capitalize">{role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Compact horizontal nav for <md screens */
export function MobileNav({
  role,
  bidderCount,
  tenderCount,
}: {
  role: Role;
  bidderCount?: number;
  tenderCount?: number;
}) {
  const pathname = usePathname();
  const allItems = SECTIONS.flatMap((s) => s.items).filter((n) => !n.roles || n.roles.includes(role));

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface-lowest px-3 py-1.5 md:hidden">
      {allItems.map((n) => {
        const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(`${n.href}/`));
        let badge = n.badge;
        if (n.href === '/bidders') {
          badge = bidderCount !== undefined ? String(bidderCount) : undefined;
        } else if (n.href === '/tenders') {
          badge = tenderCount !== undefined ? String(tenderCount) : n.badge;
        }

        return (
          <Link
            key={n.href}
            href={n.href}
            prefetch={true}
            className={`shrink-0 rounded border-b-2 px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-saffron bg-saffron/10 font-semibold text-saffron-800'
                : 'border-transparent text-ink-muted hover:bg-surface-low hover:text-navy'
            }`}
          >
            <span>{n.label}</span>
            {badge !== undefined && <span className="ml-1 font-mono text-[10px] opacity-75">({badge})</span>}
          </Link>
        );
      })}
    </nav>
  );
}
