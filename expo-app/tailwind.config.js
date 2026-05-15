/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Smart Ride Brand Colors
        primary: {
          DEFAULT: '#00FF88',
          50: '#E6FFF5',
          100: '#CCFFEB',
          200: '#99FFD6',
          300: '#66FFC2',
          400: '#33FFAD',
          500: '#00FF88',
          600: '#00CC6D',
          700: '#009952',
          800: '#006637',
          900: '#00331C',
        },
        accent: {
          DEFAULT: '#00FFF3',
          50: '#E6FFFE',
          100: '#CCFFFD',
          200: '#99FFFB',
          300: '#66FFF9',
          400: '#33FFF6',
          500: '#00FFF3',
          600: '#00CCC2',
          700: '#009992',
          800: '#006661',
          900: '#003330',
        },
        dark: {
          DEFAULT: '#0D0D12',
          50: '#1A1A24',
          100: '#14141E',
          200: '#12121C',
          300: '#10101A',
          400: '#0E0E18',
          500: '#0D0D12',
          600: '#0A0A0F',
          700: '#07070A',
          800: '#040406',
          900: '#020203',
        },
        surface: {
          DEFAULT: '#1A1A24',
          light: '#222230',
          dark: '#0B0B10',
        },
        success: '#00FF88',
        warning: '#FFB800',
        error: '#FF4757',
        info: '#00FFF3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
