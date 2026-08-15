/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        elevated: '#1A1A1A',
        cyanHighlight: '#12B5CB',
        magentaHighlight: '#F538A0',
        alertRed: '#D93025',
      },
    },
  },
  plugins: [],
};
