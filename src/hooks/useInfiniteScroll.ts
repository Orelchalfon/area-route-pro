import { useEffect, useRef } from 'react';

/**
 * Calls `onLoadMore` whenever the returned sentinel scrolls into view and there
 * is more to load. Attach `sentinelRef` to an element rendered after the list.
 * Unlike useIncrementalRender (which only slices an in-memory array), this drives
 * a real server fetch, so the callback is kept in a ref to avoid re-creating the
 * IntersectionObserver on every render.
 */
export function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean) {
  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<(node: HTMLElement | null) => void>();

  if (!sentinelRef.current) {
    sentinelRef.current = (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting) callbackRef.current();
      });
      observerRef.current.observe(node);
    };
  }

  useEffect(() => () => observerRef.current?.disconnect(), []);

  // Only expose the sentinel while there is more to load so the observer is
  // detached once the list is exhausted.
  return { sentinelRef: hasMore ? sentinelRef.current : undefined };
}
