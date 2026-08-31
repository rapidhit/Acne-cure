/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Storefront (public product pages)
        forest: "#0f3d1f",
        forestLight: "#164a26",
        lime: "#a3d65c",
        cream: "#e8f0d8",
        // Dashboard console (admin)
        ink: "#0E1420",
        inkHover: "#1B2436",
        surface: "#F5F6F8",
        hairline: "#E3E6EC",
        accent: "#3654FF",
        positive: "#0EA5A4",
        warn: "#D97706",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        console: ["'IBM Plex Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
