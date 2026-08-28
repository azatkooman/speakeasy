import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
// Ported verbatim from the inline `tailwind.config` that used to live in a
// <script> tag in index.html alongside the cdn.tailwindcss.com build. Keeping
// the token values identical means bundling Tailwind changes nothing visually.
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#8b5cf6',
        secondary: '#ec4899',
        success: '#22c55e',
        warning: '#f59e0b',
        background: '#f0f4f8',
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 0 0 rgba(0,0,0,0.1)',
        btn: '0 4px 0 0 rgba(0,0,0,0.2)',
        'btn-active': '0 0 0 0 rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [
    // The app's markup uses `animate-in`, `fade-in`, `slide-in-from-*` and
    // `zoom-in-*` in 31 places. The CDN build never included this plugin, so
    // all of those were inert. They now work as authored — see the
    // prefers-reduced-motion guard in index.css.
    tailwindcssAnimate,
  ],
};
