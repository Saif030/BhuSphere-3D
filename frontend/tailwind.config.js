/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      navy: '#1A3A6B',
      ink: '#0F2440',
      gov: {
        navy: '#1A3A6B',
        navyDark: '#10254A',
        saffron: '#E87722',
        saffronDark: '#C2410C',
        green: '#138808',
        ashoka: '#06038D',
        mist: '#F1F5F9',
        paper: '#FFFFFF',
      },
      night: { 950: '#0a1428', 900: '#0a1428', 850: '#0d1830', 800: '#111f3a', 700: '#1a2b4f', 600: '#24406e' },
      accent: { 300: '#FDBA74', 400: '#E87722', 500: '#C2410C', 600: '#9A3412' },
    },
    fontFamily: { sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'Segoe UI', 'sans-serif'] },
    boxShadow: { panel: '0 1px 3px rgba(15,36,64,.08), 0 4px 14px rgba(15,36,64,.06)' },
  } }, plugins: [] }
