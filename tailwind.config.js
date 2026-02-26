/* WeatherWhale - Tailwind Configuration */
/* Custom colors, fonts, and theme settings */
/** @type {import('tailwindcss').Config} */
module.exports = {
  /* Tell Tailwind which files to scan for class names */
  content: [
    "./index.html",
    "./js/**/*.js"
  ],

  theme: {
    extend: {
      /* Custom font families */
      fontFamily: {
        heading: ['"Nunito"', 'sans-serif'],
        body:    ['"Nunito"', 'sans-serif'],
      },

      /* Custom colors that match our sky/weather theme */
      colors: {
        sky: {
          light: '#e8f4fd',
          mid:   '#b3d9f7',
          blue:  '#4a90d9',
          dark:  '#1e5fa8',
        },
        cloud: {
          white: '#ffffff',
          soft:  '#f0f8ff',
        },
        rain: {
          dark:  '#1a2744',
          blue:  '#2c4a7c',
        }
      },

      /* Custom border radius for rounded pill/card style like the reference image */
      borderRadius: {
        'xl2': '1.25rem',
        'xl3': '1.75rem',
      },

      /* Custom box shadows for soft card look */
      boxShadow: {
        'card':  '0 4px 16px rgba(74, 144, 217, 0.15)',
        'card-hover': '0 8px 24px rgba(74, 144, 217, 0.25)',
      }
    },
  },

  plugins: [],
}
