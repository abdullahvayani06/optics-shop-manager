/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#baddfd',
          300: '#7ec0fb',
          400: '#3ba1f6',
          500: '#0284c7', // Primary optical cyan-blue
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        }
      }
    },
  },
  plugins: [],
}
