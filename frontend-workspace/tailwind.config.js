/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2761aeff",
        secondary: "#1239a2ff",
        accent: "#10B981",
        border: "#E5E7EB",
        black: "#4A8FD1",
        white: "#FAF8F3",
        slate: {
          50: '#F8FAFC',
          100: '#f1f5f9',
          200: '#E5E7EB',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#5a7db0ff',
          600: '#3f659aff',
          700: 'rgba(64, 110, 174, 1)',
          800: '#133e83ff',
          900: '#1f5196ff',
          950: '#143484ff',
        }
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
    boxShadow: {
      'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 10px -2px rgba(0, 0, 0, 0.02)',
    }
  },
  plugins: [],
}
