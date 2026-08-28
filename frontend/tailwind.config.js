/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#0f3d1f",
        forestLight: "#164a26",
        lime: "#a3d65c",
        cream: "#e8f0d8",
      },
    },
  },
  plugins: [],
};
