/**
 * @file VersionPollContext — Single interval poll of version status for all instances
 */
import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { updatesApi, type VersionStatus } from '../api/updates';

interface VersionPollContextValue {
  statuses: Record<number, VersionStatus>;
  anyUpdateAvailable: boolean;
  refresh: () => void;
}

const VersionPollContext = createContext<VersionPollContextValue>({
  statuses: {},
  anyUpdateAvailable: false,
  refresh: () => {},
});

export function useVersionPoll() {
  return useContext(VersionPollContext);
}

const POLL_INTERVAL_MS = 30_000;

interface Props {
  instanceIds: number[];
  children: React.ReactNode;
}

export function VersionPollProvider({ instanceIds, children }: Props) {
  const [statuses, setStatuses] = useState<Record<number, VersionStatus>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!instanceIds.length) return;
    const results = await Promise.allSettled(
      instanceIds.map((id) => updatesApi.getVersionStatus(id).then((r) => r.data))
    );
    setStatuses((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[instanceIds[i]] = r.value;
      });
      return next;
    });
  }, [instanceIds]);

  useEffect(() => {
    void fetchAll();
    timerRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAll]);

  const anyUpdateAvailable = Object.values(statuses).some((s) => s.update_available);

  return (
    <VersionPollContext.Provider value={{ statuses, anyUpdateAvailable, refresh: fetchAll }}>
      {children}
    </VersionPollContext.Provider>
  );
}
