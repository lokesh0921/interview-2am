import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

interface UseInfiniteScrollReturn {
  isFetching: boolean;
  setIsFetching: (isFetching: boolean) => void;
  lastElementRef: (node: HTMLElement | null) => void;
}

export const useInfiniteScroll = (
  fetchMore: () => Promise<void>,
  hasMore: boolean,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn => {
  const [isFetching, setIsFetching] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const isFetchingRef = useRef(false);

  const { threshold = 1.0, rootMargin = "100px" } = options;

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingRef.current || !hasMore) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
            console.log("[InfiniteScroll] Triggering fetch more...");
            isFetchingRef.current = true;
            setIsFetching(true);
            fetchMore()
              .then(() => {
                console.log("[InfiniteScroll] Fetch completed successfully");
                isFetchingRef.current = false;
                setIsFetching(false);
              })
              .catch((error) => {
                console.error("[InfiniteScroll] Fetch failed:", error);
                isFetchingRef.current = false;
                setIsFetching(false);
              });
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      if (node) observer.current.observe(node);
    },
    [fetchMore, hasMore, threshold, rootMargin]
  );

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return { isFetching, setIsFetching, lastElementRef };
};
