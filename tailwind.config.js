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
        paper: {
          white: '#FFFFFF',
          gray: '#F2F2F2',
          black: '#000000',
          dark: '#222222',
          'black-20': 'rgba(0, 0, 0, 0.2)',
          'black-50': 'rgba(0, 0, 0, 0.5)',
        },
        showcase: {
          lavender: '#F7F3FF',
          'lavender-deep': '#E5D7FF',
          mint: '#ECF7F1',
          'mint-deep': '#B3E2CF',
        },
        romer: {
          bg: '#FFFFFF',
          card: '#F2F2F2',
          sidebar: '#F2F2F2',
          panel: '#FFFFFF',
          divider: 'rgba(0, 0, 0, 0.1)',
          'divider-light': 'rgba(0, 0, 0, 0.05)',
          'text-muted': '#222222',
          'text-main': '#000000',
          primary: '#000000',
          'primary-hover': '#222222',
          cyan: '#000000',
          amber: '#000000',
          lime: '#000000',
        },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
        display: ['"Instrument Sans"', 'sans-serif'],
        h3: ['"Instrument Sans"', 'sans-serif'],
        h2: ['"Instrument Sans"', 'sans-serif'],
        h1: ['"Instrument Sans"', 'sans-serif'],
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

