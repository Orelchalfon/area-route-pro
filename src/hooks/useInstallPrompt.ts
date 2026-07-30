import { useCallback, useEffect, useState } from 'react';

// The `beforeinstallprompt` event isn't in the standard DOM lib types.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Which set of manual "add to home screen" instructions applies to this browser. */
export type InstallPlatform = 'ios-safari' | 'ios-other' | 'chromium';

declare global {
  interface Window {
    // Stashed by the inline script in index.html (see the comment there). Optional
    // because that script may not have run (unit tests, non-browser environments).
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function stashedPrompt() {
  return window.__deferredInstallPrompt ?? null;
}

// Custom event the inline script dispatches after stashing the prompt, so a hook that
// mounts later still learns about it.
const AVAILABLE_EVENT = 'installpromptavailable';

const STANDALONE_QUERY = '(display-mode: standalone)';

function isStandalone() {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
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

function isAndroid() {
  return /android/i.test(window.navigator.userAgent);
}

/**
 * Drives the "install to home screen" UX.
 * - Android/desktop Chromium: reads the `beforeinstallprompt` event stashed by the
 *   inline script in index.html, so we can trigger the native install dialog on demand
 *   (`canInstall` + `promptInstall`).
 * - iOS Safari: no such event, so the caller shows manual A2HS instructions (`isIos`).
 * - Android without a captured event: the caller falls back to Chrome menu instructions.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(stashedPrompt);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onAvailable = () => setDeferred(stashedPrompt());
    // Direct listener too, in case the inline script never ran (e.g. tests).
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      window.__deferredInstallPrompt = null;
    };

    // The app can also become standalone while open (install from the browser menu).
    const standaloneMedia = window.matchMedia(STANDALONE_QUERY);
    const onDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) onInstalled();
    };

    window.addEventListener(AVAILABLE_EVENT, onAvailable);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    standaloneMedia.addEventListener('change', onDisplayModeChange);
    return () => {
      window.removeEventListener(AVAILABLE_EVENT, onAvailable);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      standaloneMedia.removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return null;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // A prompt can only be *used* once, but Chrome keeps it valid after a dismissal —
    // so only drop it once the install actually happened, otherwise the user who
    // cancelled would lose the install entry point entirely (SPA never reloads).
    if (outcome === 'accepted') {
      setDeferred(null);
      window.__deferredInstallPrompt = null;
    }
    return outcome;
  }, [deferred]);

  const ios = isIos();
  const android = isAndroid();

  return {
    installed,
    isIos: ios,
    isIosSafari: isIosSafari(),
    isAndroid: android,
    /** A captured event exists — we can open the browser's native install dialog. */
    canInstall: deferred !== null,
    /**
     * There is *some* install path worth surfacing: either the native prompt, or manual
     * instructions we know are correct for this platform. False on e.g. desktop Firefox,
     * where no install exists and Chrome-menu instructions would be misleading.
     */
    canOfferInstall: deferred !== null || ios || android,
    /** Which set of manual instructions applies when `canInstall` is false. */
    platform: (ios
      ? isIosSafari()
        ? 'ios-safari'
        : 'ios-other'
      : 'chromium') as InstallPlatform,
    promptInstall,
  };
}
