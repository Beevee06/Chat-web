/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0f131e',
          card: '#1b1f2b',
          accent: '#00f5ff',
          secondary: '#ff24e4',
          text: '#dfe2f2',
          muted: '#b9caca'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif']
      }
    },
  },
  plugins: [],
}
