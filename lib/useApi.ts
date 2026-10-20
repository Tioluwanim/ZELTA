"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

export interface Async<T> { data: T | null; error: string | null; loading: boolean; reload: () => void; status?: number }
interface Settled<T> { key: string; data: T | null; error: string | null; status?: number }

/** Runs `fn` whenever `deps` change or `reload()` is called. `loading` is derived: true until the current request settles. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [res, setRes] = useState<Settled<T> | null>(null);
  const [tick, setTick] = useState(0);
  const key = `${JSON.stringify(deps)}#${tick}`;
  useEffect(() => {
    let live = true;
    fn().then(
      (data) => { if (live) setRes({ key, data, error: null }); },
      (e: unknown) => { if (live) setRes({ key, data: null, status: e instanceof ApiError ? e.status : undefined,
        error: e instanceof Error ? e.message : "Something went wrong." }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const settled = res?.key === key;
  return { data: settled ? res.data : (res?.data ?? null), error: settled ? res.error : null, status: res?.status, loading: !settled, reload };
}
