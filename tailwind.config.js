/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette "stabilimento" — vedi DESIGN.md
        profondo: {
          DEFAULT: '#0F3B4C', // blu profondo — testi e navigazione
          900: '#0B2C39',
          700: '#0F3B4C',
          600: '#1B4E62',
          500: '#2E7D9A', // azzurro cabina
          400: '#4E97B2',
          300: '#8FBFCF',
          100: '#D6E5EA',
        },
        cabina: '#2E7D9A', // azzurro cabina
        acqua: '#7FB7A8', // verde acqua bassa
        calce: {
          DEFAULT: '#EDF1F2', // sfondo calce fredda
          card: '#FBFCFC',
          200: '#DCE4E6',
          300: '#C4D0D3',
        },
        tenda: '#F2C14E', // giallo tenda
        boa: '#E4572E', // rosso boa
        // Colori di stato postazione (derivati, leggibili in pieno sole)
        stato: {
          libera: '#5FA891', // verde acqua saturo
          occupata: '#E4572E', // rosso boa
          prenotata: '#F2C14E', // giallo tenda
          stagionale: '#2E7D9A', // azzurro cabina
          fuoriservizio: '#9AA7AB', // grigio spento
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 59, 76, 0.06), 0 1px 3px rgba(15, 59, 76, 0.04)',
        drawer: '-8px 0 24px rgba(15, 59, 76, 0.12)',
        pop: '0 4px 16px rgba(15, 59, 76, 0.14)',
      },
    },
  },
  plugins: [],
}
