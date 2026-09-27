import { createContext, useContext, useState, useEffect, useMemo } from "react";

export const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
  isDark: false,
  setTheme: () => {},
});

/**
 * Helper to determine initial theme:
 * 1. Check localStorage for "theme" ("dark" or "light")
 * 2. Fall back to system preference (prefers-color-scheme: dark)
 * 3. Default to "light"
 */
function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch (error) {
    console.warn("Failed to read theme from localStorage/system preferences:", error);
  }

  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    try {
      const isDark = theme === "dark";
      if (isDark) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.classList.add("dark-mode");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.body.classList.remove("dark-mode");
      }
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.warn("Failed to persist theme to localStorage:", error);
    }
  }, [theme]);

  // Listen for system theme changes if user hasn't explicitly set preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // Only apply if user hasn't explicitly saved a preference
      const saved = localStorage.getItem("theme");
      if (!saved) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === "dark",
      isProviderActive: true,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeProvider;
