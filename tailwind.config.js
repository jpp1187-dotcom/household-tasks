/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      colors: {
        sage: {
          50: '#f4f7f4',
          100: '#e8f0e8',
          200: '#c9ddc9',
          300: '#9ec09e',
          400: '#6d9f6d',
          500: '#4a7c4a',
          600: '#3a6438',
          700: '#2f502e',
          800: '#274126',
          900: '#1e321e',
        },
        clay: {
          50: '#fdf6f0',
          100: '#fae9d8',
          200: '#f4cfaf',
          300: '#ecae7d',
          400: '#e48a4a',
          500: '#da6f28',
          600: '#c4581e',
          700: '#a3431a',
          800: '#84361a',
          900: '#6c2d18',
        },
      },
    },
  },
  plugins: [],
}
