/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f6efe4",
        foreground: "#18230f",
        card: "#fffaf2",
        "card-foreground": "#18230f",
        popover: "#fffaf2",
        "popover-foreground": "#18230f",
        primary: "#2f6f4f",
        "primary-foreground": "#fffaf2",
        secondary: "#e8ddc8",
        "secondary-foreground": "#214d37",
        muted: "#efe5d6",
        "muted-foreground": "#5f6b53",
        accent: "#d7ead6",
        "accent-foreground": "#214d37",
        destructive: "#8d2e20",
        "destructive-foreground": "#fff7f2",
        border: "rgba(24, 35, 15, 0.12)",
        input: "rgba(24, 35, 15, 0.12)",
        ring: "#2f6f4f",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(57, 48, 28, 0.14)",
      },
      fontFamily: {
        display: ["Georgia", '"Times New Roman"', "serif"],
        body: ["Georgia", '"Times New Roman"', "serif"],
      },
      backgroundImage: {
        "paper-wash":
          "radial-gradient(circle at top left, rgba(223, 192, 140, 0.38), transparent 30%), radial-gradient(circle at top right, rgba(105, 160, 123, 0.28), transparent 28%), linear-gradient(180deg, #f7f1e7 0%, #efe6d6 100%)",
      },
    },
  },
  plugins: [],
};
