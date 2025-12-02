/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'board-light': '#f0d9b5',
        'board-dark': '#b58863',
        'selected': 'rgba(34, 139, 34, 0.5)',
        'possible-move': 'rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
}