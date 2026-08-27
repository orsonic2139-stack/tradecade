/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Terminal backgrounds
        bg: {
          base: '#0a0a0b',
          panel: '#111113',
          elevated: '#161618',
          hover: '#1d1d20',
          input: '#0d0d0f',
        },
        // Borders
        border: {
          DEFAULT: '#222225',
          subtle: '#1a1a1d',
          strong: '#2a2a2e',
        },
        // Text
        txt: {
          primary: '#e4e4e7',
          secondary: '#a1a1aa',
          muted: '#71717a',
          faint: '#52525b',
        },
        // Trading
        bull: {
          DEFAULT: '#22c55e',
          dim: '#16a34a',
          bg: 'rgba(34, 197, 94, 0.1)',
        },
        bear: {
          DEFAULT: '#ef4444',
          dim: '#dc2626',
          bg: 'rgba(239, 68, 68, 0.1)',
        },
        // Gold accent
        gold: {
          DEFAULT: '#d4af37',
          dim: '#a88a2a',
          bright: '#e8c547',
        },
        // Status
        live: '#22c55e',
        warn: '#f59e0b',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        'xs': ['11px', '16px'],
      },
      spacing: {
        '4.5': '1.125rem',
      },
      transitionDuration: {
        '150': '150ms',
      },
    },
  },
  plugins: [],
};
