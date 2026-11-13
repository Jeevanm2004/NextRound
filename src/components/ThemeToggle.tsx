import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'light' | 'dark';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (currentTheme: Theme) => {
      if (currentTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }

      const meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) {
        meta.setAttribute('content', currentTheme);
      }

      localStorage.setItem('theme', currentTheme);
    };

    applyTheme(theme);

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';

    // Smooth view transition if supported by browser and not reduced motion
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      setTheme(nextTheme);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#fafafa] active:scale-90 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
    >
      {/* Sun Icon (Rotates & scales in dark mode) */}
      <Sun
        className={`h-4 w-4 text-[#fbbf24] absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100 group-hover:rotate-45'
            : '-rotate-90 scale-0 opacity-0 pointer-events-none'
        }`}
      />
      {/* Moon Icon (Rotates & scales in light mode) */}
      <Moon
        className={`h-4 w-4 text-[#3b82f6] absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          theme === 'light'
            ? 'rotate-0 scale-100 opacity-100 group-hover:-rotate-12'
            : 'rotate-90 scale-0 opacity-0 pointer-events-none'
        }`}
      />
    </button>
  );
};
