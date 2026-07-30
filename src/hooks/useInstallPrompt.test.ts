import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInstallPrompt } from './useInstallPrompt';

type Outcome = 'accepted' | 'dismissed';

/** Stand-in for Chrome's `beforeinstallprompt` event. */
function makePromptEvent(outcome: Outcome) {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: Outcome }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

afterEach(() => {
  window.__deferredInstallPrompt = null;
});

describe('useInstallPrompt', () => {
  it('picks up a prompt stashed before the hook mounted', () => {
    // The real regression: index.html captures the event while the app is still behind
    // the async auth gate, so the hook must read the stash rather than rely on the event.
    window.__deferredInstallPrompt = makePromptEvent('accepted');

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(true);
    expect(result.current.canOfferInstall).toBe(true);
  });

  it('starts with no install path when nothing was stashed', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
  });

  it('reacts to the stash being filled after mount', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);

    act(() => {
      window.__deferredInstallPrompt = makePromptEvent('accepted');
      window.dispatchEvent(new Event('installpromptavailable'));
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('captures the event directly when the inline script never ran', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(makePromptEvent('accepted'));
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('keeps the install offer after the user cancels the native dialog', async () => {
    window.__deferredInstallPrompt = makePromptEvent('dismissed');
    const { result } = renderHook(() => useInstallPrompt());

    let outcome: Outcome | null = null;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(outcome).toBe('dismissed');
    // Chrome keeps the event usable after a dismissal — dropping it would strand the
    // user with no way back to the install flow (the SPA never reloads).
    expect(result.current.canInstall).toBe(true);
  });

  it('drops the prompt once the install is accepted', async () => {
    window.__deferredInstallPrompt = makePromptEvent('accepted');
    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.canInstall).toBe(false);
    expect(window.__deferredInstallPrompt).toBeNull();
  });

  it('marks the app installed on appinstalled', () => {
    window.__deferredInstallPrompt = makePromptEvent('accepted');
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.installed).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('reports the iOS Safari instruction platform from the user agent', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
    );

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isIos).toBe(true);
    expect(result.current.isIosSafari).toBe(true);
    expect(result.current.platform).toBe('ios-safari');
    // No install event exists on iOS, but we still have instructions to offer.
    expect(result.current.canInstall).toBe(false);
    expect(result.current.canOfferInstall).toBe(true);
    vi.restoreAllMocks();
  });

  it('routes iOS Chrome to the "open in Safari" instructions', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
    );

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isIos).toBe(true);
    expect(result.current.isIosSafari).toBe(false);
    expect(result.current.platform).toBe('ios-other');
    vi.restoreAllMocks();
  });

  it('offers Chrome-menu instructions on Android with no captured event', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    );

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isAndroid).toBe(true);
    expect(result.current.platform).toBe('chromium');
    expect(result.current.canInstall).toBe(false);
    // The Android bug: previously this meant "show nothing at all".
    expect(result.current.canOfferInstall).toBe(true);
    vi.restoreAllMocks();
  });

  it('offers nothing on a desktop browser with no install support', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    );

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canOfferInstall).toBe(false);
    vi.restoreAllMocks();
  });
});
