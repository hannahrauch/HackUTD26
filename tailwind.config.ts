import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { toyota: '#EB0A1E', ink: '#1a1a1a', mist: '#F2F3F4', pos: '#12805c', warn: '#c98200' } } },
  plugins: []
} satisfies Config;
