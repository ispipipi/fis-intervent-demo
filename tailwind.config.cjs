/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#1d3150",
        line: "#dce7f5",
        accent: "#187d80",
        slatewash: "#f7fbff",
        canvas: "#eaf3ff",
        navy: "#1d3150",
        teal: "#187d80",
        muted: "#687991"
      }
    }
  },
  plugins: []
};
