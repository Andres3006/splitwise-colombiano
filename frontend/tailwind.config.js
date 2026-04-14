/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          100: '#dce9e3',
          950: '#102c24',
          900: '#173c31',
          800: '#21493c',
          700: '#296151'
        },
        cream: {
          50: '#f8f6f0',
          100: '#f3efe7',
          200: '#ebe3d3'
        },
        copper: {
          100: '#f8e2c7',
          200: '#f4c995',
          300: '#f1b36b',
          400: '#e9963f',
          500: '#d97706',
          600: '#b85b08',
          700: '#92400e'
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['"Segoe UI"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        panel: '0 24px 60px rgba(16, 44, 36, 0.08)',
        soft: '0 10px 30px rgba(16, 44, 36, 0.08)'
      },
      backgroundImage: {
        paper:
          'radial-gradient(circle at top left, rgba(217,119,6,0.12), transparent 24%), radial-gradient(circle at bottom right, rgba(16,44,36,0.08), transparent 24%), linear-gradient(135deg, #f7f4ec 0%, #f1ebdf 48%, #f8f6f0 100%)'
      }
    }
  },
  plugins: [],
};
