import { useEffect, useState } from "react";

/**
 * Whole-dataset counts for admin stat cards.
 *
 * Each stat issues a lightweight `pageSize: 1` request against the resource's
 * list endpoint and reads `total` from the paginated response, so the cards
 * reflect ALL matching records across every page — not just the rows on the
 * current page. Pass the list `data` (or any value that changes after a
 * mutation refetch) in `deps` so the counts refresh after create/edit/delete.
 */
export function useAdminStats<
  TQuery extends { page?: number; pageSize?: number },
>(
  listFn: (query: TQuery) => Promise<{ total: number }>,
  statQueries: Record<string, TQuery>,
  deps: unknown[] = [],
): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const keys = Object.keys(statQueries);
  const keysSig = keys.join("|");

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      keys.map((key) =>
        listFn({ ...statQueries[key], page: 1, pageSize: 1 })
          .then((res) => res.total)
          .catch(() => 0),
      ),
    ).then((totals) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      keys.forEach((key, index) => {
        next[key] = totals[index];
      });
      setCounts(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSig, ...deps]);

  return counts;
}
