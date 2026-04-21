import { useEffect, useState } from "react";

const KEY = "matrix-theme";

type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

type Props = {
  /**
   * "fixed" (default) renders the toggle as a fixed pill in the bottom-left corner.
   * "inline" removes fixed positioning so the toggle can be placed inside a sidebar
   * or any other flow-positioned container.
   */
  variant?: "fixed" | "inline";
};

export function ThemeToggle({ variant = "fixed" }: Props) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = readInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={variant === "inline" ? "theme-toggle-inline" : "theme-toggle"}
      aria-label="Toggle dark mode"
      aria-pressed={theme === "dark"}
    >
      <span className="dot" aria-hidden="true" />
      <span>{theme === "dark" ? "DARK" : "LIGHT"}</span>
    </button>
  );
}
