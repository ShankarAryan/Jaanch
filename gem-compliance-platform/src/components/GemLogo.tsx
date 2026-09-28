export function GemIcon({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="GeM Emblem">
      {/* Top Leaf - Vibrant Orange */}
      <path d="M50 8L64 36L50 50L36 36Z" fill="#F26522" />
      <path d="M50 8L64 36L50 50Z" fill="#D84F12" opacity="0.85" />

      {/* Right Leaf - Golden Amber */}
      <path d="M92 50L64 64L50 50L64 36Z" fill="#FBB03B" />
      <path d="M92 50L64 64L50 50Z" fill="#E59920" opacity="0.85" />

      {/* Bottom Leaf - Deep Government Navy */}
      <path d="M50 92L36 64L50 50L64 64Z" fill="#002147" />
      <path d="M50 92L36 64L50 50Z" fill="#00142C" opacity="0.85" />

      {/* Left Leaf - Vibrant Teal Cyan */}
      <path d="M8 50L36 36L50 50L36 64Z" fill="#00A896" />
      <path d="M8 50L36 36L50 50Z" fill="#008A7B" opacity="0.85" />

      {/* Inner Central Micro Star Highlight */}
      <circle cx="50" cy="50" r="4" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

export function GemFullLogo({
  size = 'md',
  showTagline = true,
  showEmblem = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  showEmblem?: boolean;
}) {
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <div className="flex items-center gap-3 select-none">
      {/* GeM Geometric Star Icon */}
      <div className="relative shrink-0 drop-shadow-sm">
        <GemIcon className={isLg ? 'h-14 w-14' : isSm ? 'h-8 w-8' : 'h-11 w-11'} />
      </div>

      {/* Wordmark */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-heading font-black tracking-tight text-[#002147] ${isLg ? 'text-4xl' : isSm ? 'text-2xl' : 'text-3xl'}`}>
            GeM
          </span>
          <span className="h-2 w-2 rounded-full bg-[#F26522]" />
        </div>
        <span className={`font-heading font-bold text-ink uppercase tracking-wide ${isLg ? 'text-xs mt-0.5' : 'text-[10px]'}`}>
          Government e Marketplace
        </span>
        {showTagline && (
          <span className="text-[9px] font-medium tracking-wider text-ink-muted/80 mt-0.5">
            Speed • Transparency • Efficiency
          </span>
        )}
      </div>

      {/* Optional GoI Emblem separator */}
      {showEmblem && (
        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-line ml-1">
          <div className="flex flex-col text-[10px] text-ink-muted leading-tight font-medium">
            <span className="font-semibold text-navy">Government of India</span>
            <span>Ministry of Commerce &amp; Industry</span>
          </div>
        </div>
      )}
    </div>
  );
}
