import { useEffect, useMemo, useRef, useState } from 'react';

interface IncrementalRenderResult<T> {
  /** The slice of items currently mounted. */
  visible: T[];
  /** Attach to a sentinel element rendered after the list; scrolling to it loads more. */
  sentinelRef: (node: HTMLElement | null) => void;
  /** Whether there are still items waiting to be revealed. */
  hasMore: boolean;
}

/**
 * Renders a long list incrementally so the mounted DOM stays bounded regardless
 * of the total item count. Reveals `pageSize` items at a time as the sentinel
 * scrolls into view, and resets back to the first page whenever `items` changes
 * (e.g. a new search term).
 */
export function useIncrementalRender<T>(items: T[], pageSize = 60): IncrementalRenderResult<T> {
  const [count, setCount] = useState(pageSize);

  // Reset when the source list identity changes (new filter/search result).
  useEffect(() => {
    setCount(pageSize);
  }, [items, pageSize]);

  const hasMore = count < items.length;

  const sentinelRef = useRef<(node: HTMLElement | null) => void>();
  const observerRef = useRef<IntersectionObserver | null>(null);
  if (!sentinelRef.current) {
    sentinelRef.current = (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting) {
          setCount(prev => prev + pageSize);
        }
      });
      observerRef.current.observe(node);
    };
  }

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const visible = useMemo(() => items.slice(0, count), [items, count]);

  return { visible, sentinelRef: sentinelRef.current, hasMore };
}
