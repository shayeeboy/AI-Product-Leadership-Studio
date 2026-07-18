/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral slate app chrome
        ink: {
          950: "#0b1120",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
          400: "#94a3b8",
          300: "#cbd5e1",
          200: "#e2e8f0",
          100: "#f1f5f9",
          50: "#f8fafc",
        },
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3b6fed",
          600: "#2b57d4",
          700: "#2244a8",
        },
        // Consistent status vocabulary across the whole app
        status: {
          healthy: "#16a34a",
          risk: "#d97706",
          budget: "#dc2626",
          blocked: "#b91c1c",
          pending: "#7c3aed",
          archived: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
