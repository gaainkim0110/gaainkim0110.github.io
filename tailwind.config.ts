import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nanum-square)', 'sans-serif'],
        'nanum': ['var(--font-nanum-square)', 'sans-serif'],
        'nanum-bold': ['var(--font-nanum-square-bold)', 'sans-serif'],
      },
      colors: {
        'node-level2': '#70AD47',
        'node-default': '#F2F2F2',
        'node-executive': '#AAAAAA',
        'text-primary': '#333333',
        'text-inverse': '#FFFFFF',
        'glass': {
          light: 'rgba(255, 255, 255, 0.25)',
          dark: 'rgba(0, 0, 0, 0.25)',
        },
      },
      backdropBlur: {
        'glass': '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'node': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'neon': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 20px currentColor',
      },
      animation: {
        'wiggle': 'wiggle 0.3s ease-in-out',
        'neon-pulse': 'neon-pulse 1.5s ease-in-out infinite',
        'expand': 'expand 0.3s ease-out',
        'collapse': 'collapse 0.3s ease-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        'neon-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px #3b82f6, 0 0 10px #3b82f6' },
          '50%': { boxShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6' },
        },
        expand: {
          '0%': { opacity: '0', transform: 'scaleY(0)' },
          '100%': { opacity: '1', transform: 'scaleY(1)' },
        },
        collapse: {
          '0%': { opacity: '1', transform: 'scaleY(1)' },
          '100%': { opacity: '0', transform: 'scaleY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
