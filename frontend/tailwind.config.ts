import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // Custom font family
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },

      // Custom colors matching brand
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },

      // Custom spacing for touch targets
      spacing: {
        '44': '2.75rem', // 44px minimum touch target
        '48': '3rem',
        '52': '3.25rem',
      },

      // Minimum height for touch targets
      minHeight: {
        '44': '2.75rem', // 44px minimum for buttons
      },

      // Minimum width for touch targets
      minWidth: {
        '44': '2.75rem',
      },

      // Screen sizes with mobile-first approach
      screens: {
        'xs': '320px',   // Small phones
        'sm': '640px',   // Tablets
        'md': '768px',   // Small laptops
        'lg': '1024px',  // Laptops
        'xl': '1280px',  // Large screens
        '2xl': '1536px', // Very large screens
      },

      // Container queries for component-level responsiveness
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          md: '2rem',
          lg: '2rem',
          xl: '2rem',
        },
      },

      // Z-index layers
      zIndex: {
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        auto: 'auto',
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modal: '1040',
        popover: '1050',
        tooltip: '1060',
      },

      // Transitions for smooth animations
      transitionProperty: {
        'colors': 'color, background-color, border-color, text-decoration-color, fill, stroke',
        'opacity': 'opacity',
        'shadow': 'box-shadow',
        'transform': 'transform',
      },

      // Animation for loading and transitions
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-fast': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },

  plugins: [
    // Custom plugin for safe area insets (notch support)
    function ({ addComponents, theme }) {
      addComponents({
        '.safe-inset-t': {
          paddingTop: 'max(var(--safe-area-inset-top, 0px), var(--app-padding-top, 0px))',
        },
        '.safe-inset-b': {
          paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), var(--app-padding-bottom, 0px))',
        },
        '.safe-inset-l': {
          paddingLeft: 'max(var(--safe-area-inset-left, 0px), var(--app-padding-left, 0px))',
        },
        '.safe-inset-r': {
          paddingRight: 'max(var(--safe-area-inset-right, 0px), var(--app-padding-right, 0px))',
        },
      });
    },

    // Responsive typography
    function ({ addComponents, theme }) {
      addComponents({
        // Responsive heading sizes
        '.heading-lg': {
          '@apply text-2xl sm:text-3xl md:text-4xl font-bold': {},
        },
        '.heading-md': {
          '@apply text-xl sm:text-2xl md:text-3xl font-bold': {},
        },
        '.heading-sm': {
          '@apply text-lg sm:text-xl md:text-2xl font-semibold': {},
        },
        '.body-lg': {
          '@apply text-base sm:text-lg': {},
        },
        '.body-md': {
          '@apply text-sm sm:text-base': {},
        },
        '.body-sm': {
          '@apply text-xs sm:text-sm': {},
        },
      });
    },
  ],

  // Important for overriding library styles if needed
  important: false,

  // Dark mode configuration
  darkMode: 'media',
};

export default config;
