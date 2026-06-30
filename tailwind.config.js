/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{html,js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        noesis: {
          void: '#070B1D',
          violet: '#2D0050',
          indigo: '#0B50FB',
          gold: '#C5A017',
          emerald: '#10B5A7',
          parchment: '#F0EDE3',
          surface: '#0E1428',
        },
      },
      fontFamily: {
        display: ['Panchang', 'serif'],
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        breathe: 'breathe 3s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}

