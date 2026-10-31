"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "optely:local-storage";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Boolean i localStorage, synkad mellan komponenter och flikar. */
export function useLocalStorageBoolean(key: string, fallback: boolean) {
  const subscribe = useCallback((onChange: () => void) => {
    const handler = (e: Event) => {
      if (e instanceof StorageEvent && e.key !== key) return;
      onChange();
    };
    window.addEventListener("storage", handler);
    window.addEventListener(EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(EVENT, handler);
    };
  }, [key]);

  const value = useSyncExternalStore(
    subscribe,
    () => {
      const raw = read(key);
      return raw === null ? fallback : raw === "1";
    },
    () => fallback,
  );

  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Privat läge e.d. – ignorera.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, set] as const;
}
