/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#105d90',
          dark:    '#0a4570',
          light:   '#daeaf6',
        },
        navy: {
          DEFAULT: '#050b2b',
          800:     '#0d1545',
          700:     '#1a2560',
        },
        cyan: {
          DEFAULT: '#00f5ff',
          dim:     '#00c8d4',
        },
        surface: {
          DEFAULT: '#f8faff',
          alt:     '#eef2fb',
        },
        success: {
          DEFAULT: '#006826',
          light:   '#00c853',
          bg:      '#d4f5e2',
        },
        warning: {
          DEFAULT: '#7a4f00',
          light:   '#ffab00',
          bg:      '#fff3cd',
        },
        danger: {
          DEFAULT: '#b5000e',
          light:   '#ff1744',
          bg:      '#ffe0e3',
        },
        muted: {
          DEFAULT: '#4f637a',
          light:   '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card:         '0 1px 3px rgba(5,11,43,0.08), 0 1px 2px rgba(5,11,43,0.04)',
        'card-hover': '0 4px 12px rgba(5,11,43,0.12), 0 2px 4px rgba(5,11,43,0.06)',
        'card-lg':    '0 8px 24px rgba(5,11,43,0.12)',
        brand:        '0 4px 14px rgba(16,93,144,0.35)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #105d90 0%, #0a4570 100%)',
        'gradient-navy':  'linear-gradient(180deg, #050b2b 0%, #0d1545 100%)',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.25s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
};
