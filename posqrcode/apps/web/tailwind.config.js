import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          hover: 'hsl(var(--brand-hover) / <alpha-value>)',
          tint: 'hsl(var(--brand-tint) / <alpha-value>)',
          /** Text/icon colour that sits ON a solid brand fill — flips per theme. */
          foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
        },
        ink: {
          900: 'hsl(var(--ink-900) / <alpha-value>)',
          800: 'hsl(var(--ink-800) / <alpha-value>)',
          700: 'hsl(var(--ink-700) / <alpha-value>)',
        },
        nav: {
          DEFAULT: 'hsl(var(--nav-bg) / <alpha-value>)',
          fg: 'hsl(var(--nav-fg) / <alpha-value>)',
          muted: 'hsl(var(--nav-muted))',
          hover: 'hsl(var(--nav-hover))',
          border: 'hsl(var(--nav-border))',
          active: 'hsl(var(--nav-active) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          page: 'hsl(var(--surface-page) / <alpha-value>)',
          muted: 'hsl(var(--surface-muted) / <alpha-value>)',
        },
        line: 'hsl(var(--line) / <alpha-value>)',
        bluesoft: '#B2D1FA',
        success: { DEFAULT: '#16A34A', tint: 'hsl(var(--success-tint) / <alpha-value>)' },
        warning: { DEFAULT: '#D97706', tint: 'hsl(var(--warning-tint) / <alpha-value>)' },
        info: { DEFAULT: '#2563EB', tint: 'hsl(var(--info-tint) / <alpha-value>)' },
        danger: { DEFAULT: '#DC2626', tint: 'hsl(var(--danger-tint) / <alpha-value>)' },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        /** Landing/auth brand face — not tied to admin font picker. */
        marketing: ['Syne', '"Space Grotesk"', 'sans-serif'],
        marketBody: ['var(--font-sans)'],
        sans: ['var(--font-sans)'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'mkt-marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'mkt-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'mkt-fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'mkt-marquee': 'mkt-marquee 36s linear infinite',
        'mkt-float': 'mkt-float 6s ease-in-out infinite',
        'mkt-fade-up': 'mkt-fade-up 0.7s ease-out both',
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        card: '16px',
        hero: '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,8,7,0.04)',
        raised: '0 4px 12px rgba(11,8,7,0.06)',
        float: '0 10px 30px rgba(11,8,7,0.08)',
      },
      maxWidth: { content: '1440px', pwa: '480px' },
    },
  },
  plugins: [animate],
}
