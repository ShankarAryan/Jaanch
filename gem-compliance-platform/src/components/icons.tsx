/**
 * Small inline SVG glyphs — no icon-library dependency (checked package.json,
 * lucide-react is not installed and this pass must not add a dependency).
 *
 * All icons draw with `currentColor` so the parent controls the colour:
 * badge glyphs inherit the pill's text colour; form-field icons are set to
 * `text-chakra` (navy) as the secondary accent; the brand wheel is navy.
 *
 * Pure presentational components (no hooks) — safe to import from both server
 * and client components.
 */

type IconProps = { className?: string };

/** ✓ — verified / MET / low-risk. */
export function CheckIcon({ className = 'h-3 w-3' }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ● — pending / needs review / medium. */
export function DotIcon({ className = 'h-2 w-2' }: IconProps) {
  return (
    <svg viewBox="0 0 8 8" className={className} aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}

/** — — not started / not applicable. */
export function DashIcon({ className = 'h-3 w-3' }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M3 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Generic 24-spoke wheel glyph for the header brand mark. Hand-drawn line art —
 * deliberately NOT a trace of the State Emblem of India or the Ashoka Chakra
 * from the national flag; this is a hackathon prototype, not an official GoI site.
 */
export function ChakraWheel({ className = 'h-8 w-8' }: IconProps) {
  const spokes = [];
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    spokes.push(
      <line
        key={i}
        x1="16"
        y1="16"
        x2={(16 + 13 * Math.sin(a)).toFixed(2)}
        y2={(16 - 13 * Math.cos(a)).toFixed(2)}
        stroke="currentColor"
        strokeWidth="0.6"
      />,
    );
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#fff" />
      <circle cx="16" cy="16" r="13.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
      {spokes}
    </svg>
  );
}

/* ---- Form-field icons (thin line style) ---- */

export function UserIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="5" r="2.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 13.5c0-2.6 2.46-4.25 5.5-4.25s5.5 1.65 5.5 4.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IdIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.5" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9 7h4M9 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="7" width="10" height="6.5" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5.2a3 3 0 0 1 6 0V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function RefreshIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M13 8a5 5 0 1 1-1.46-3.54" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 2.5V5h-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClipboardIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3" width="9" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3v-.75C6 1.56 6.56 1 7.25 1h1.5C9.44 1 10 1.56 10 2.25V3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 7h4M6 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function PencilIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M10.5 2.5 13.5 5.5 6 13l-3.5.5L3 10 10.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function UploadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 10.5V3M8 3 5.25 5.75M8 3l2.75 2.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ---- Sidebar / stat-card glyphs (thin line style, currentColor) ---- */

export function GridIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function UsersIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 13.5c0-2.4 2.1-3.9 4.5-3.9s4.5 1.5 4.5 3.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 3.4a2.3 2.3 0 0 1 0 4.2M12 9.8c1.8.3 3 1.6 3 3.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 1.5 13 3.4v4.1c0 3.4-2.1 5.9-5 7-2.9-1.1-5-3.6-5-7V3.4L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.8 8 7.4 9.6 10.4 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FileIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 1.5h5L13 5.5V14a.5.5 0 0 1-.5.5h-8A.5.5 0 0 1 4 14V1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 1.5V5.5h4M6 8.5h4M6 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function LinkIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M6.5 9.5 9.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7 4.5 8.2 3.3a2.4 2.4 0 0 1 3.5 3.5L10.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 11.5 7.8 12.7a2.4 2.4 0 0 1-3.5-3.5L5.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function BankIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 6 8 2.5 14 6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3.5 6.5v5M6.5 6.5v5M9.5 6.5v5M12.5 6.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2.5 12.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function TimelineIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 2v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="4" cy="4.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="11" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.5h6M7 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SparkIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2.5 9.2 5.8 12.5 7 9.2 8.2 8 11.5 6.8 8.2 3.5 7 6.8 5.8 8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12.5 2v2.4M11.3 3.2h2.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function LayersIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 1.5 1.5 5 8 8.5 14.5 5 8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 8.5 8 12l6.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 11.5 8 15l6.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function BriefcaseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="4.5" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 4.5V3a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 10.5 3v1.5M2 8.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ScaleIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2v12M3 4.5h10M3 4.5 1.5 9h3L3 4.5ZM13 4.5 11.5 9h3L13 4.5ZM5.5 14h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BarChartIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 14h12M4 11.5V7.5M8 11.5V3.5M12 11.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ScanIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 5V3a1 1 0 0 1 1-1h2M11 2h2a1 1 0 0 1 1 1v2M14 11v2a1 1 0 0 1-1 1h-2M5 14H3a1 1 0 0 1-1-1v-2M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatBubbleIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 10c0-3.59 3.13-6.5 7-6.5s7 2.91 7 6.5-3.13 6.5-7 6.5c-1.04 0-2.03-.21-2.92-.6L4 16.5l.77-3.08A6.41 6.41 0 0 1 3.5 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SendIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="m14 2-6.5 12-1.8-4.7L1 7.5 14 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m5.7 9.3 4.8-4.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="m4 4 8 8M12 4 4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BotFaceIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="11.5" r="1.5" fill="currentColor" />
      <path d="M9 15.5c1 .8 2 1.2 3 1.2s2-.4 3-1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 2v4M2 12.5h1M21 12.5h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MinimizeIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v.5M8 7.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}


/** Modern GeM AI Neural Core emblem (replaces cartoon robot face) */
export function GemAiIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Glowing 4-point intelligence spark */}
      <path
        d="M12 2.5C12 7.7 7.7 12 2.5 12C7.7 12 12 16.3 12 21.5C12 16.3 16.3 12 21.5 12C16.3 12 12 7.7 12 2.5Z"
        fill="currentColor"
      />
      {/* Secondary accent spark */}
      <path
        d="M12 7C12 9.8 9.8 12 7 12C9.8 12 12 14.2 12 17C12 14.2 14.2 12 17 12C14.2 12 12 9.8 12 7Z"
        fill="#ffffff"
        fillOpacity="0.4"
      />
      {/* Center core */}
      <circle cx="12" cy="12" r="1.8" fill="#ffffff" />
      {/* Satellite telemetry nodes */}
      <circle cx="4.5" cy="4.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
      <circle cx="19.5" cy="4.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
      <circle cx="19.5" cy="19.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
      <circle cx="4.5" cy="19.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
    </svg>
  );
}

/** Move / Drag handle icon */
export function MoveIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 1.5v13M1.5 8h13M8 1.5l2 2M8 1.5l-2 2M8 14.5l2-2M8 14.5l-2-2M1.5 8l2 2M1.5 8l2-2M14.5 8l-2 2M14.5 8l-2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Flip Corner position icon (switch Left <-> Right) */
export function FlipSideIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 4.5h12M10 2l2.5 2.5L10 7M14 11.5H2M6 9l-2.5 2.5L6 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertTriangleIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M7.13 2.5a1 1 0 0 1 1.74 0l5.5 9.5A1 1 0 0 1 13.5 13.5h-11a1 1 0 0 1-.87-1.5l5.5-9.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6v3.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function NetworkIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="16" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9" y="16" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 8v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M12 13v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2v8.5M8 10.5 5.25 7.75M8 10.5l2.75-2.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossCircleIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="m6 6 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 1.5 13 3.4v4.1c0 3.4-2.1 5.9-5 7-2.9-1.1-5-3.6-5-7V3.4L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
