/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Habitline theme colors — CSS variables (light/dark automatic)
        'habit-bg': 'rgb(var(--color-habit-bg) / <alpha-value>)',
        'habit-bg-light': 'rgb(var(--color-habit-bg-light) / <alpha-value>)',
        'habit-card': 'rgb(var(--color-habit-card) / <alpha-value>)',
        'habit-card-hover': 'rgb(var(--color-habit-card-hover) / <alpha-value>)',
        'habit-text': 'rgb(var(--color-habit-text) / <alpha-value>)',
        'habit-skeleton': 'rgb(var(--color-habit-skeleton) / <alpha-value>)',
        // Borders & muted text — rgba (no alpha-value decomposition needed)
        'habit-border': 'var(--color-habit-border)',
        'habit-border-light': 'var(--color-habit-border-light)',
        'habit-text-muted': 'var(--color-habit-text-muted)',
        'habit-text-subtle': 'var(--color-habit-text-subtle)',
        // Accent colors — fixed (same in both themes)
        'habit-cyan': '#0283a7',
        'habit-orange': '#ff4c00',
        'habit-orange-light': '#ff6b2c',
        'habit-orange-dark': '#e04400',
        'habit-success': '#12a70a',
        'habit-success-light': '#22c55e',
        'habit-purple': '#8b5cf6',
        'habit-blue': '#3b82f6',
        'habit-red': '#ef4444',
        // Brand colors - Orange theme (Habitline style)
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Secondary - Dark theme
        secondary: {
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
        // Accent per gamification
        accent: {
          gold: '#FFD700',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
          xp: '#8B5CF6',
        },
        // Status colors
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      borderRadius: {
        'habit': '24px',
        'habit-sm': '16px',
        'habit-lg': '32px',
        'habit-xl': '40px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        heading: ['Geist', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['4rem', { lineHeight: '1.1', fontWeight: '700' }],
        'hero-sm': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'section': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        'section-sm': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      boxShadow: {
        'habit': 'var(--shadow-habit)',
        'habit-lg': 'var(--shadow-habit-lg)',
        'habit-glow': '0 0 40px rgba(255, 76, 0, 0.3)',
        'habit-card': 'var(--shadow-habit-card)',
        'habit-card-hover': 'var(--shadow-habit-card-hover)',
      },
      backgroundImage: {
        'habit-gradient': 'linear-gradient(135deg, #1a1c1c 0%, #131515 100%)',
        'habit-gradient-orange': 'linear-gradient(135deg, #ff4c00 0%, #ff6b2c 100%)',
        'habit-gradient-dark': 'linear-gradient(180deg, rgba(19, 21, 21, 0) 0%, #131515 100%)',
        'habit-hero': 'radial-gradient(ellipse at center top, rgba(255, 76, 0, 0.15) 0%, transparent 60%)',
        'habit-hero-glow': 'radial-gradient(ellipse at center, rgba(255, 76, 0, 0.2) 0%, transparent 70%)',
        'habit-card-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'badge-unlock': 'badgeUnlock 0.6s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 76, 0, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 76, 0, 0.5)' },
        },
        badgeUnlock: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(10deg)' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
