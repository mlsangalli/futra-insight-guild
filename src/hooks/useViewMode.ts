/**
 * Reactive store for the synthetic-data view mode (admin-only toggle).
 *
 * Backed by localStorage, but exposed via useSyncExternalStore so that
 * `setViewMode(...)` re-renders every consumer in the current tab — not just
 * other tabs (which the native `storage` event already covers).
 */
import { useSyncExternalStore } from 'react';

export type SyntheticViewMode = 'real' | 'synthetic' | 'both';

const STORAGE_KEY = 'futra-synthetic-view';
const EVENT = 'futra-synthetic-view-change';

function readMode(): SyntheticViewMode {
  if (typeof window === 'undefined') return 'synthetic';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'real' || v === 'both' ? v : 'synthetic';
  } catch {
    return 'synthetic';
  }
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  const onLocal = () => cb();
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, onLocal);
  };
}

export function useViewMode(): SyntheticViewMode {
  return useSyncExternalStore(subscribe, readMode, () => 'synthetic');
}

export function setViewMode(mode: SyntheticViewMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* no-op: localStorage may be blocked */
  }
}

/** Non-reactive read — only use in side effects, never in render bodies. */
export function getViewModeSnapshot(): SyntheticViewMode {
  return readMode();
}
