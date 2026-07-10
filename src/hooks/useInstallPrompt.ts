import { useCallback, useEffect, useState } from 'react';

// The `beforeinstallprompt` event isn't in the standard DOM lib types.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari uses a non-standard navigator.standalone flag.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ Safari reports a desktop Mac UA by default; detect it via touch support.
  return (
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  );
}

// On iOS, "Add to Home Screen" only exists in real Safari — not in in-app webviews
// (WhatsApp/Gmail/Instagram/…) or third-party iOS browsers (Chrome/Firefox use CriOS/FxiOS).
function isIosSafari() {
  if (!isIos()) return false;
  const ua = window.navigator.userAgent;
  const inAppOrOtherBrowser = /CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line|Twitter|GSA/i.test(
    ua,
  );
  return /Safari/i.test(ua) && !inAppOrOtherBrowser;
}

/**
 * Drives the "install to home screen" UX.
 * - Android/desktop Chromium: captures `beforeinstallprompt` so we can trigger the
 *   native install dialog on demand (`canInstall` + `promptInstall`).
 * - iOS Safari: no such event, so the caller shows manual A2HS instructions (`isIos`).
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar; we drive our own UI
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return null;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null); // a prompt can only be used once
    return outcome;
  }, [deferred]);

  return {
    installed,
    isIos: isIos(),
    isIosSafari: isIosSafari(),
    canInstall: deferred !== null,
    promptInstall,
  };
}
