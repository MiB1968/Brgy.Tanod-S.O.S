import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tanod / Guardian AI Brand
        tanod: {
          dark: '#0a1428',
          accent: '#6b21a7',      // Purple
          accent2: '#a855f7',
          success: '#22c55e',
          warning: '#eab308',
          danger: '#ef4444',
        },
        // Dark theme base
        dark: {
          bg: '#0a1428',
          card: '#0f1f3a',
          border: '#334155',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
