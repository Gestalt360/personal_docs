/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        keep: {
          white: '#ffffff',
          red: '#f28b82',
          orange: '#fbbc04',
          yellow: '#fff475',
          green: '#ccff90',
          teal: '#a7ffeb',
          blue: '#cbf0f8',
          darkblue: '#aecbfa',
          purple: '#d7aefb',
          pink: '#fdcfe8',
          brown: '#e6c9a8',
          gray: '#e8eaed',
        }
      }
    },
  },
  plugins: [],
}
