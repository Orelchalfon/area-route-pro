import { useEffect, useRef } from 'react';

// How long after a refresh to ignore further resume triggers. `visibilitychange` and
// `online` routinely fire together (unlocking a phone that reconnects), and `pageshow`
// can follow both — without this guard one resume would fan out into three rounds of
// six queries each.
const REFRESH_THROTTLE_MS = 5000;

/**
 * Refetch everything when the app comes back to the foreground.
 *
 * Supabase realtime is the app's only live-update path, and `postgres_changes` does NOT
 * replay events that occurred while the socket was down. iOS tears the WebSocket down
 * whenever a standalone (added-to-home-screen) PWA is backgrounded, so a technician who
 * locks their phone misses every change made in the meantime and — with no address bar
 * and no pull-to-refresh in standalone mode — has no way to recover short of force-quitting.
 *
 * Listening on resume closes that gap: whatever the socket missed is picked up by a plain
 * refetch the moment the app is visible again.
 */
export function useResumeRefresh(refreshAll: () => void | Promise<void>) {
  // Kept in a ref so a changing callback identity never re-registers the listeners.
  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;

  const lastRefreshRef = useRef(0);

  useEffect(() => {
    const maybeRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_THROTTLE_MS) return;
      lastRefreshRef.current = now;
      void refreshRef.current();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') maybeRefresh();
    };

    // iOS restores a backgrounded PWA from the bfcache, which fires `pageshow` but not
    // always `visibilitychange`. Only `persisted` restores are a resume — a plain
    // `pageshow` also fires on the very first load, which would otherwise fire a second
    // round of six queries on top of the initial fetch every hook already does on mount.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) maybeRefresh();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', maybeRefresh);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', maybeRefresh);
    };
  }, []);
}
