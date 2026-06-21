/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        moph: {
          dark: '#0f4c81',
          light: '#2d82b5',
          accent: '#06d6a0',
          danger: '#ef476f'
        }
      }
    },
  },
  plugins: [
    require('flowbite/plugin')
  ],
}
