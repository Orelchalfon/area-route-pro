import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResumeRefresh } from './useResumeRefresh';

// jsdom's document.visibilityState is a read-only getter, so override it per test.
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

function fireVisibilityChange(state: 'visible' | 'hidden') {
  setVisibility(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

// jsdom has no PageTransitionEvent constructor, so tack `persisted` onto a plain Event.
// `persisted` distinguishes a bfcache restore (a real resume) from the `pageshow` that
// fires on every first load.
function firePageShow(persisted: boolean) {
  const event = Object.assign(new Event('pageshow'), { persisted });
  window.dispatchEvent(event);
}

describe('useResumeRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes when the app becomes visible again', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    fireVisibilityChange('visible');

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when the app is hidden', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    fireVisibilityChange('hidden');

    expect(refresh).not.toHaveBeenCalled();
  });

  // The guard that stops one resume (which fires visibilitychange + online + pageshow
  // together) from fanning out into several rounds of six queries each.
  it('throttles two resumes that land within the window into one refresh', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    fireVisibilityChange('visible');
    vi.advanceTimersByTime(1000);
    fireVisibilityChange('visible');

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes again once the throttle window has passed', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    fireVisibilityChange('visible');
    vi.advanceTimersByTime(10_000);
    fireVisibilityChange('visible');

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('collapses visibilitychange + online + pageshow from a single resume', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    fireVisibilityChange('visible');
    window.dispatchEvent(new Event('online'));
    firePageShow(true);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes on a bfcache restore (pageshow with persisted)', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    firePageShow(true);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // The `pageshow` of a cold start is not a resume — refetching there would double the
  // initial load's queries for nothing.
  it('ignores the non-persisted pageshow of a first load', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    firePageShow(false);

    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes on `online` alone (reconnect without a visibility change)', () => {
    const refresh = vi.fn();
    renderHook(() => useResumeRefresh(refresh));

    window.dispatchEvent(new Event('online'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('uses the latest callback without re-registering listeners', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ fn }) => useResumeRefresh(fn), {
      initialProps: { fn: first },
    });

    rerender({ fn: second });
    fireVisibilityChange('visible');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops listening after unmount', () => {
    const refresh = vi.fn();
    const { unmount } = renderHook(() => useResumeRefresh(refresh));

    unmount();
    fireVisibilityChange('visible');
    window.dispatchEvent(new Event('online'));

    expect(refresh).not.toHaveBeenCalled();
  });
});
