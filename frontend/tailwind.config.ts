import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:       "#0D1B2A",
        ink2:      "#1E2B3A",
        paper:     "#F6F4EF",
        surface:   "#FFFFFF",
        line:      "#E5E1D8",
        line2:     "#D8D3C6",
        muted:     "#5A6573",
        muted2:    "#8A94A1",
        amber:     "#F2B61F",
        amberSoft: "#FAEBB5",
        teal:      "#1F8FA6",
        tealDark:  "#177082",
        tealSoft:  "#D7ECF1",
        success:   "#2F8F6F",
        warning:   "#F2B61F",
        danger:    "#B5412B",

        // Thin compat for the HTML body class and existing `border-border`
        // utility surfaces — these keep the legacy class names usable
        // without reintroducing the brand/navy/steel families.
        bg:        "#F6F4EF",
        border:    "#E5E1D8",
      },
      fontFamily: {
        sans:    ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Barlow Condensed"', "Inter", "sans-serif"],
        mono:    ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        display: ["56px", { lineHeight: "60px", fontWeight: "600", letterSpacing: "-0.02em" }],
      },
      maxWidth: {
        content: "1400px",
      },
      borderRadius: {
        card: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
