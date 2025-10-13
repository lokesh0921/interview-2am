import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalSettings } from "../contexts/AppStateContext";

/**
 * Hook to track navigation and update active page in global state
 * This ensures we always know which page the user was last on
 */
export function useNavigationState() {
  const location = useLocation();
  const { updateActivePage } = useGlobalSettings();

  useEffect(() => {
    // Only update if path actually changed to avoid render loops
    updateActivePage(location.pathname);
  }, [location.pathname]);
}

/**
 * Hook to restore scroll position when navigating back to a page
 */
export function useScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    // Save scroll position when leaving a page
    const saveScrollPosition = () => {
      sessionStorage.setItem(
        `scroll-${location.pathname}`,
        window.scrollY.toString()
      );
    };

    // Restore scroll position when entering a page
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem(
        `scroll-${location.pathname}`
      );
      if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }
    };

    // Restore immediately
    restoreScrollPosition();

    // Save on beforeunload
    window.addEventListener("beforeunload", saveScrollPosition);

    return () => {
      window.removeEventListener("beforeunload", saveScrollPosition);
      saveScrollPosition();
    };
  }, [location.pathname]);
}

/**
 * Hook to manage URL query parameters for state persistence
 * This allows users to bookmark or share URLs with their current state
 */
export function useURLState<T extends Record<string, any>>(
  defaultState: T,
  options: {
    excludeKeys?: (keyof T)[];
    debounceMs?: number;
  } = {}
) {
  const location = useLocation();
  const { excludeKeys = [], debounceMs = 300 } = options;

  // Parse current URL state
  const getURLState = (): Partial<T> => {
    const params = new URLSearchParams(location.search);
    const state: Partial<T> = {};

    Object.keys(defaultState).forEach((key) => {
      if (excludeKeys.includes(key as keyof T)) return;

      const value = params.get(key);
      if (value !== null) {
        try {
          // Try to parse as JSON first (for arrays, objects)
          state[key as keyof T] = JSON.parse(value);
        } catch {
          // Fall back to string value
          state[key as keyof T] = value as T[keyof T];
        }
      }
    });

    return state;
  };

  // Update URL with new state
  const updateURLState = (newState: Partial<T>) => {
    const params = new URLSearchParams(location.search);

    Object.entries(newState).forEach(([key, value]) => {
      if (excludeKeys.includes(key as keyof T)) return;

      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        // Stringify complex values
        const stringValue =
          typeof value === "string" ? value : JSON.stringify(value);
        params.set(key, stringValue);
      }
    });

    const newSearch = params.toString();
    const newURL = `${location.pathname}${newSearch ? `?${newSearch}` : ""}`;

    // Use replaceState to avoid adding to browser history
    window.history.replaceState({}, "", newURL);
  };

  return {
    urlState: getURLState(),
    updateURLState,
  };
}

/**
 * Hook to sync component state with URL parameters
 * Useful for filters, pagination, etc.
 */
export function useURLSyncState<T extends Record<string, any>>(
  state: T,
  updateState: (newState: Partial<T>) => void,
  options: {
    excludeKeys?: (keyof T)[];
    debounceMs?: number;
  } = {}
) {
  const { urlState, updateURLState } = useURLState(state, options);
  const { debounceMs = 300 } = options;

  // Sync URL state to component state on mount
  useEffect(() => {
    if (Object.keys(urlState).length > 0) {
      updateState(urlState);
    }
  }, []); // Only run on mount

  // Sync component state to URL with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateURLState(state);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [state, debounceMs]);

  return {
    urlState,
    updateURLState,
  };
}
