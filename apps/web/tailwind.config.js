/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // Token Tailwind/shadcn dipetakan ke CSS variable legacy (full-color)
      // di index.css. Ini menjaga kompatibilitas dengan inline var(--...) lama
      // sekaligus mengaktifkan komponen shadcn (bg-primary, text-muted-foreground).
      colors: {
        border: 'var(--card-border)',
        input: 'var(--border)',
        ring: 'var(--primary)',
        background: 'var(--canvas)',
        foreground: 'var(--text)',
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          soft: 'var(--primary-soft)',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'var(--canvas)',
          foreground: 'var(--text)',
        },
        destructive: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: 'var(--canvas)',
          foreground: 'var(--muted)',
        },
        accent: {
          DEFAULT: 'var(--accent-soft)',
          foreground: 'var(--accent)',
        },
        popover: {
          DEFAULT: 'var(--panel)',
          foreground: 'var(--text)',
        },
        card: {
          DEFAULT: 'var(--panel)',
          foreground: 'var(--text)',
        },
        warning: {
          DEFAULT: 'var(--warn)',
          soft: 'var(--warn-soft)',
          foreground: '#ffffff',
        },
        faint: 'var(--faint)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius-sm)',
        sm: 'calc(var(--radius-sm) - 4px)',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
          'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      boxShadow: {
        card: 'var(--shadow)',
        pop: '0 20px 60px rgba(15, 23, 42, 0.18)',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
