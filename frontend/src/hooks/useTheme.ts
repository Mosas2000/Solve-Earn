import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--background', '#0F0F23');
      root.style.setProperty('--surface', '#1A1A35');
      root.style.setProperty('--surface-light', '#252542');
      root.style.setProperty('--text', '#E8E8F0');
      root.style.setProperty('--text-muted', '#9CA3AF');
      root.style.setProperty('--border', '#374151');
    } else {
      root.style.setProperty('--background', '#FFFFFF');
      root.style.setProperty('--surface', '#FFFFFF');
      root.style.setProperty('--surface-light', '#F8F9FA');
      root.style.setProperty('--text', '#1A1A1A');
      root.style.setProperty('--text-muted', '#6C757D');
      root.style.setProperty('--border', '#E5E7EB');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
};
