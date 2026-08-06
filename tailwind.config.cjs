/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#18202f",
        line: "#d8dee8",
        accent: "#2563eb",
        slatewash: "#f4f7fb"
      }
    }
  },
  plugins: []
};
