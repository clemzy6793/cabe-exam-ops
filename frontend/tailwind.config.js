/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1a3a5c', light: '#2a5a8c', dark: '#0d1f33' },
        accent: { DEFAULT: '#c8a951', light: '#e0c76a' },
      },
    },
  },
  plugins: [],
};
