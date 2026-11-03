import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Theme, ThemeSwitchVariant } from '../components/arc/theme-switch/theme-switch';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme, variant?: ThemeSwitchVariant, trigger?: HTMLElement) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'phishshield_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setCurrentTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const applyTheme = (next: Theme, _variant?: ThemeSwitchVariant, trigger?: HTMLElement) => {
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      trigger &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const rect = trigger.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (document as any).startViewTransition(() => {
        document.documentElement.setAttribute('data-theme', next);
        setCurrentTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
      });

      transition.ready
        ?.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 380,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        })
        .catch(() => {
          document.documentElement.setAttribute('data-theme', next);
          setCurrentTheme(next);
          localStorage.setItem(STORAGE_KEY, next);
        });
    } else {
      document.documentElement.setAttribute('data-theme', next);
      setCurrentTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
