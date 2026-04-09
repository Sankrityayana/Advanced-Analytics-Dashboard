/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          900: "#070d12",
          800: "#0e1821",
          700: "#142330",
        },
        accent: {
          cyan: "#24d1ce",
          amber: "#ffb65c",
          lime: "#7fd85c",
          rose: "#ff7d7d",
        },
      },
      boxShadow: {
        soft: "0 14px 38px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};
