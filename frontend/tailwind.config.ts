import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a0e1a', 800: '#0f1626', 700: '#16203a' },
        gold: '#ffd166',
        neon: '#39ff8b',
        loss: '#ff5d6c',
      },
      boxShadow: { glow: '0 0 24px rgba(57,255,139,.25)' },
      width: {
        'sidebar-expanded': '260px',
        'sidebar-collapsed': '72px',
      },
      spacing: {
        'sidebar-expanded': '260px',
        'sidebar-collapsed': '72px',
      },
    },
  },
  plugins: [],
};
export default config;
