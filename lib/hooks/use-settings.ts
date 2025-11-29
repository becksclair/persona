import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

export interface UserSettings {
  enterSendsMessage: boolean;
  theme: "light" | "dark" | "system";
}

const DEFAULT_SETTINGS: UserSettings = {
  enterSendsMessage: true,
  theme: "system",
};

// Simple cache for settings to avoid refetching on every mount
interface SettingsCache {
  data: UserSettings | null;
  loading: boolean;
  fetchPromise: Promise<void> | null;
  listeners: Set<() => void>;
}

const cache: SettingsCache = {
  data: null,
  loading: false,
  fetchPromise: null,
  listeners: new Set(),
};

function notifyListeners() {
  cache.listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  cache.listeners.add(listener);
  return () => cache.listeners.delete(listener);
}

function getSnapshot(): UserSettings {
  return cache.data ?? DEFAULT_SETTINGS;
}

function getServerSnapshot(): UserSettings {
  return DEFAULT_SETTINGS;
}

async function fetchSettingsOnce(setTheme: (theme: string) => void): Promise<void> {
  if (cache.data !== null) return;
  if (cache.fetchPromise) return cache.fetchPromise;

  cache.loading = true;
  notifyListeners();

  cache.fetchPromise = (async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        cache.data = {
          enterSendsMessage: data.enterSendsMessage ?? true,
          theme: data.theme ?? "system",
        };
        if (data.theme) {
          setTheme(data.theme);
        }
      } else {
        cache.data = DEFAULT_SETTINGS;
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      cache.data = DEFAULT_SETTINGS;
    } finally {
      cache.loading = false;
      cache.fetchPromise = null;
      notifyListeners();
    }
  })();

  return cache.fetchPromise;
}

export function useSettings() {
  const { setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  // Use useSyncExternalStore for cached settings
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const loading = cache.loading && cache.data === null;

  // Fetch on mount (uses cache if available)
  useEffect(() => {
    void fetchSettingsOnce(setTheme);
  }, [setTheme]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      setSaving(true);
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (res.ok) {
          const data = await res.json();
          // Update cache
          cache.data = {
            enterSendsMessage: data.enterSendsMessage ?? true,
            theme: data.theme ?? "system",
          };
          notifyListeners();

          // Sync theme with next-themes
          if (updates.theme) {
            setTheme(updates.theme);
          }

          return true;
        }
      } catch (err) {
        console.error("Failed to update settings:", err);
      } finally {
        setSaving(false);
      }
      return false;
    },
    [setTheme],
  );

  return {
    settings,
    loading,
    saving,
    updateSettings,
  };
}
