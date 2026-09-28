import type { Config } from 'tailwindcss';

/**
 * Design system extracted from the "GovProcure AI" reference mockup — a warm
 * institutional palette (saffron / navy / india-green on a warm off-white),
 * Hanken Grotesk headings + Inter body + JetBrains Mono for identifiers,
 * and a deliberately sharp radius scale for a government-tool feel.
 *
 * NOTE: this is a presentation layer only. None of these tokens change what
 * the app fetches, computes, or does.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // --- warm surfaces (Material "surface container" ladder) ---
        surface: {
          DEFAULT: '#fff8f5', // page background
          lowest: '#ffffff', // cards
          low: '#fff1e8', // active nav / subtle fills
          container: '#faebe2',
          high: '#f4e5dc',
          highest: '#eee0d6',
        },
        // --- text / lines ---
        ink: {
          DEFAULT: '#211a15', // body text
          muted: '#534438', // secondary text
          faint: '#867466', // tertiary / disabled
        },
        line: '#d8c2b3', // hairline borders (outline-variant)

        // --- institutional accents ---
        navy: { DEFAULT: '#000080', 700: '#00006e' }, // headings, primary institutional
        indigo: { DEFAULT: '#3339a3', 600: '#4c53bc' }, // the "AI" accent
        brown: { DEFAULT: '#6d3a00', 600: '#8f4e00' }, // deep primary

        // existing flag tokens — kept, referenced widely; DEFAULTs match the mockup
        saffron: { DEFAULT: '#FF9933', 700: '#B36200', 800: '#8A4B00' },
        chakra: { DEFAULT: '#0B3D7A', 700: '#082a57' },
        indiagreen: { DEFAULT: '#138808', 700: '#0c5c05' },

        // --- semantic status (used by badges + score/risk mapping) ---
        success: { DEFAULT: '#138808', fg: '#0c5c05' },
        warning: { DEFAULT: '#FF9933', fg: '#8f4e00' },
        critical: { DEFAULT: '#ba1a1a', fg: '#93000a', container: '#ffdad6' },

        risk: { low: '#16a34a', medium: '#d97706', high: '#dc2626' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-hanken)', 'var(--font-inter)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-jbmono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // semantic scale from the mockup — added alongside Tailwind's text-xs..
        display: ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['2rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        h2: ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        data: ['0.75rem', { lineHeight: '1rem' }],
        label: ['0.75rem', { lineHeight: '1rem', fontWeight: '600' }],
      },
      borderRadius: {
        // sharper than Tailwind default; `full` left intact for pills/avatars
        DEFAULT: '3px',
        sm: '2px',
        md: '5px',
        lg: '7px',
        xl: '10px',
      },
      spacing: {
        sidebar: '17rem', // 272px — persistent left nav
        topbar: '3.5rem', // 56px — top bar
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,128,0.04), 0 4px 12px rgba(0,0,128,0.04)',
        rail: '-4px 0 12px rgba(0,0,128,0.03)',
      },
    },
  },
  plugins: [],
};

export default config;
