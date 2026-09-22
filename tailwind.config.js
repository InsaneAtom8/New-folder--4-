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
        romer: {
          bg: '#070708',
          card: '#101112',
          sidebar: '#0d0e0f',
          panel: '#111214',
          divider: '#232426',
          'divider-light': '#1B1C1E',
          'text-muted': '#9A9DA3',
          'text-main': '#e5e2e3',
          primary: '#5E6BFF',
          'primary-hover': '#7a85ff',
          cyan: '#50d8e9',
          amber: '#ffb689',
          lime: '#E5FD17',
        },
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
          bg: '#070708',
          card: '#101112',
          panel: '#111214',
          border: '#232426',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        h3: ['Manrope', 'sans-serif'],
        h2: ['Manrope', 'sans-serif'],
        h1: ['Manrope', 'sans-serif'],
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

