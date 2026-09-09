/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbff',
          100: '#d5f5ff',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0284c7',
          900: '#0c4a6e',
          accent: '#00f2fe',
        },
        hazard: {
          minor: '#10b981',
          moderate: '#f59e0b',
          critical: '#ef4444',
        },
        dark: {
          bg: '#0b0f19',
          card: '#111827',
          panel: '#1f293d',
          border: '#374151',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scan 2.5s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        }
      }
    },
  },
  plugins: [],
}
