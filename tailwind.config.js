/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        rack: {
          gold: '#D4A843',
          'gold-light': '#E8C675',
          'gold-dark': '#B08930',
          charcoal: '#2D2D2D',
          'charcoal-dark': '#1A1A1A',
          'charcoal-light': '#3D3D3D',
          surface: '#252525',
          white: '#F5F5F5',
          green: '#2D7D4F',
          red: '#C44B4B',
          blue: '#4B7DC4',
        },
      },
      fontFamily: {
        display: ['var(--font-saira)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
