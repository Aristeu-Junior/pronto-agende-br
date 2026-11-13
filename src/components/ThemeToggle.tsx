import { useEffect, useState } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#14100D' : '#FFFFFF');
  try {
    localStorage.setItem('pa-theme', theme);
  } catch {
    /* armazenamento bloqueado: o tema vale só nesta visita */
  }
}

export default function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pa-theme') setTheme(currentTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Ativar modo escuro' : 'Ativar modo claro';

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      title={label}
      aria-label={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-500/50 cursor-pointer ${
        floating ? 'fixed right-3 top-3 z-50' : ''
      }`}
    >
      {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" weight="bold" /> : <Moon className="h-[18px] w-[18px]" weight="bold" />}
    </button>
  );
}
