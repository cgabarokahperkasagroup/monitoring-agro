// =====================================================================
// Tailwind / NativeWind — token desain selaras PRD §12 (clean, putih,
// dominan hijau sawit, kontras tinggi, target sentuh besar).
// Warna mengikuti lib/theme.ts agar konsisten dgn kode non-className.
// =====================================================================
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: '#FFFFFF',
        card: '#F6F8F7',
        'card-border': '#E6EAE8',
        border: '#E2E8F0',
        ink: '#0F172A',
        muted: '#64748B',
        faint: '#94A3B8',
        primary: {
          DEFAULT: '#15803D', // hijau sawit
          dark: '#166534',
          soft: '#DCFCE7',
        },
        accent: {
          DEFAULT: '#0E7490',
          soft: '#E0F2FE',
        },
        warn: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          soft: '#FEE2E2',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '16px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};
