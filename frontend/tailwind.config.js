/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      navy: '#0b1e3a',
      ink: '#0f2748',
      night: { 950: '#060c18', 900: '#0a1428', 850: '#0d1830', 800: '#111f3a', 700: '#1a2b4f', 600: '#24406e' },
      accent: { 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' },
    },
    fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'] },
    boxShadow: { panel: '0 8px 28px rgba(0,0,0,.35)' },
  } }, plugins: [] }
