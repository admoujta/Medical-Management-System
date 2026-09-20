import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        atlas: {
          ink: 'rgb(var(--atlas-ink) / <alpha-value>)',
          petrol: 'rgb(var(--atlas-petrol) / <alpha-value>)',
          teal: 'rgb(var(--atlas-teal) / <alpha-value>)',
          aqua: 'rgb(var(--atlas-aqua) / <alpha-value>)',
          sage: 'rgb(var(--atlas-sage) / <alpha-value>)',
          mist: 'rgb(var(--atlas-mist) / <alpha-value>)',
          ivory: '#fbfaf7',
          warm: '#f5efe6',
          line: 'rgb(var(--atlas-line) / <alpha-value>)',
          cloud: '#f7faf9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        atlas: '0 24px 70px rgba(16, 47, 56, 0.12)',
        panel: '0 18px 50px rgba(16, 47, 56, 0.09)'
      },
      transitionTimingFunction: {
        atlas: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
} satisfies Config
