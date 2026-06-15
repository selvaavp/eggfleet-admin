import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── Design tokens from assets/design-tokens/colors.json ──────────────
      colors: {
        /** Figma admin dashboard reference — primary orange bar & accents */
        primary: {
          DEFAULT: '#FE7102',
          dark: '#E86502',
          light: 'rgba(254,113,2,0.15)',
          subtle: 'rgba(254,113,2,0.12)',
          tint: 'rgba(253,184,129,0.10)',
          focus: 'rgba(144,77,0,0.20)',
        },
        /** M1.3 Admin — fill_FEU7DQ / fill_IHX1WB */
        sidebar: {
          DEFAULT: '#004360',
          dark: '#004C6C',
        },
        /** Figma label brown — use `text-taupe`, `bg-taupe`, `border-taupe` (see --color-taupe) */
        taupe: {
          DEFAULT: 'var(--color-taupe, #564334)',
          muted: 'var(--color-taupe-muted, #6B5D4F)',
        },
        success: {
          DEFAULT: '#0D9488',
        },
        info: {
          DEFAULT: '#2563EB',
          tint: 'rgba(0,181,252,0.10)',
        },
        danger: {
          DEFAULT: '#BA1A1A',
          tint: 'rgba(186,26,26,0.40)',
        },
        warning: {
          DEFAULT: '#FF8C00',
        },
        /** Figma — main content peach / off-white */
        app: '#FFF5F0',
        canvas: '#FFF5F0',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#E9E8E6',
          strong: '#ACADAD',
        },
        /** Pill inputs, pagination, soft dividers — `border-light-grey`, `text-light-grey` */
        'light-grey': 'var(--color-light-grey, #E0E0E0)',
        dark: '#212121',
        brown: '#2F1500',
        muted: '#5C5958',
        disabled: '#ACADAD',
        // Palette
        orange: {
          50: '#FFF3E0',
          500: '#FE7102',
          600: '#E86502',
          700: '#FF8C00',
          900: '#904D00',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#FFFEF9',
          100: '#F4F3F1',
          200: '#E9E8E6',
          400: '#ACADAD',
          500: '#A3A3A3',
          600: '#5C5958',
          900: '#212121',
        },
        teal: { 500: '#0D9488', 800: '#004C6C', 900: '#004360' },
        blue: { 500: '#2563EB' },
        cyan: { 500: '#00B5FC' },
        red: { 500: '#BA1A1A' },
        /** Login / forgot-password left hero column — Figma rgba(254, 113, 2, 0.2) */
        auth: {
          hero: 'rgba(254, 113, 2, 0.2)',
        },
      },

      // ── Typography from assets/design-tokens/typography.json ─────────────
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Manrope', 'Inter', 'ui-sans-serif'],
      },
      fontSize: {
        '2xs': ['9px', { lineHeight: '1.25em' }],
        xs: ['11px', { lineHeight: '1.25em' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '1.5em' }],
        base: ['14px', { lineHeight: '1.5em' }],
        md: ['15px', { lineHeight: '1.25em' }],
        /** Table body / ledger row copy (explicit 16px — `text-base` in this theme is 14px) */
        'body-md': ['16px', { lineHeight: '1.5em' }],
        lg: ['18px', { lineHeight: '1.3em' }],
        xl: ['20px', { lineHeight: '1.25em' }],
        '2xl': ['24px', { lineHeight: '1.25em' }],
        '3xl': ['30px', { lineHeight: '1.2em' }],
        '4xl': ['40px', { lineHeight: '34.53px' , letterSpacing: '-0.72px'}],
      },

      // ── Effects from assets/design-tokens/effects.json ───────────────────
      boxShadow: {
        btn: '0px 4px 12px 0px rgba(254,113,2,0.30)',
        card: '0px 8px 24px 0px rgba(26,28,27,0.12)',
        panel: '0px 20px 50px 0px rgba(0,0,0,0.15)',
        sm: '0px 2px 8px 0px rgba(0,0,0,0.06)',
        xs: '0px 1px 4px 0px rgba(0,0,0,0.06)',
        modal: '0px 8px 24px 0px rgba(26,28,27,0.12)',
        navbar: '0px -2px 12px 0px rgba(0,0,0,0.08)',
        pill: '0px 2px 6px 0px rgba(254,113,2,0.40)',
        assignment: '0px 4px 16px 0px rgba(254,113,2,0.25)',
        subtle: '0px 12px 40px 0px rgba(26,28,27,0.03)',
        focus: '0px 0px 0px 2px rgba(144,77,0,0.20)',
      },

      backgroundImage: {
        'gradient-premium': 'linear-gradient(172deg, #904D00 0%, #FF8C00 100%)',
        'gradient-navbar': 'rgba(250,249,247,0.80)',
      },

      spacing: {
        /** Top inset below fixed search bar — store detail / list headers */
        'page-top': '32px',
      },

      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
