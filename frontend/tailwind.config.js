/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#000000', // page titles and the strongest emphasis
        body: '#444340', // running text
        muted: '#737373', // secondary text and icons
        line: '#eeeeee', // hairline rules
        field: '#e5e5e5', // input and outline button borders
        shelf: '#f8f8f8', // secondary surfaces
        accent: {
          DEFAULT: '#278458', // primary actions only
          hover: '#1f6b47',
        },
        danger: '#c22b10', // overdue, errors and destructive actions
        positive: '#10c22b', // status dots only
      },
      borderRadius: {
        DEFAULT: '5px',
        lg: '8px',
      },
      boxShadow: {
        soft: '0 8px 30px rgb(0 0 0 / 0.08)', // modals and popovers only
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Libre Baskerville"', 'Georgia', 'serif'], // page titles and placeholder covers only
      },
    },
  },
  plugins: [],
}
