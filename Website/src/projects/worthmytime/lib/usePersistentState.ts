import { useEffect, useRef, useState } from 'react';

const PREFIX = 'wmt:';

/**
 * useState that mirrors to localStorage. SSR-safe: the first render always uses
 * `initial` (matching the server), then localStorage is read after mount — so
 * hydration never mismatches. Writes are skipped until that initial load runs,
 * so a stored value is never clobbered by the default.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore unavailable / corrupt storage
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // ignore quota / unavailable storage
    }
  }, [key, value]);

  return [value, setValue] as const;
}
