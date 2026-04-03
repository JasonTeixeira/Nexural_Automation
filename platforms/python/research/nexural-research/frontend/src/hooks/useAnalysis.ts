import { useCallback, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function useAsync<T>() {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<T>) => {
    setStatus("loading");
    setError(null);
    try {
      const result = await fn();
      setData(result);
      setStatus("success");
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  return { data, status, error, run, setData };
}
