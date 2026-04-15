/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(222, 41%, 7%)",
        foreground: "hsl(210, 20%, 96%)",
        card: {
          DEFAULT: "hsl(222, 37%, 12%)",
          foreground: "hsl(210, 20%, 96%)",
        },
        primary: {
          DEFAULT: "hsl(217, 91%, 60%)",
          foreground: "hsl(210, 20%, 96%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 84%, 60%)",
          foreground: "hsl(210, 20%, 96%)",
        },
        success: {
          DEFAULT: "hsl(142, 71%, 45%)",
          foreground: "hsl(210, 20%, 96%)",
        },
        warning: {
          DEFAULT: "hsl(38, 92%, 50%)",
          foreground: "hsl(222, 41%, 7%)",
        },
        border: "hsl(220, 25%, 22%)",
        input: "hsl(220, 25%, 22%)",
        ring: "hsl(217, 91%, 60%)",
        muted: {
          DEFAULT: "hsl(222, 37%, 16%)",
          foreground: "hsl(210, 20%, 60%)",
        },
        sidebar: "hsl(222, 44%, 9%)",
      },
      borderRadius: {
        lg: "0.9rem",
        md: "0.7rem",
        sm: "0.5rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
