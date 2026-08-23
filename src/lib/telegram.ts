/**
 * Telegram WebApp SDK integration.
 * Detects whether the app is running inside Telegram and exposes
 * helpers for theme adaptation and the back button.
 */

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: string) => void;
    notificationOccurred: (type: string) => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegram(): boolean {
  return getTelegramWebApp() !== null;
}

export function initTelegram(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  const tg = getTelegramWebApp();
  tg?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotify(type: 'success' | 'error' | 'warning' = 'success'): void {
  const tg = getTelegramWebApp();
  tg?.HapticFeedback?.notificationOccurred(type);
}

export function showBackButton(onClick: () => void): () => void {
  const tg = getTelegramWebApp();
  if (!tg) return () => {};
  tg.BackButton.show();
  tg.BackButton.onClick(onClick);
  return () => {
    tg.BackButton.offClick(onClick);
    tg.BackButton.hide();
  };
}
