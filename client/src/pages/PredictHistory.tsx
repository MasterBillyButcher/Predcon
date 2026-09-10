import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, History } from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import type { Prediction, PredictionStatus } from "../types";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";

type Filter = "ALL" | PredictionStatus;
const FILTERS: Filter[] = ["ALL", "ACTIVE", "LOCKED", "RESOLVED", "CANCELLED", "EXPIRED"];
const PAGE_SIZE = 10;

export function PredictHistory() {
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    api
      .get<Prediction[]>("/predictions?status=ALL")
      .then(setPredictions)
      .catch(() => setError("Couldn't load prediction history."));
  }, []);

  const filtered = useMemo(() => {
    if (!predictions) return [];
    let list = predictions;
    if (filter !== "ALL") list = list.filter((p) => p.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.question.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const diff = new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime();
      return sort === "newest" ? diff : -diff;
    });
    return list;
  }, [predictions, filter, query, sort]);

  const visible = filtered.slice(0, visibleCount);

  if (error) return <ErrorState message={error} />;
  if (!predictions) return <LoadingState label="Loading history..." />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-text-primary">History</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-full border px-3 py-1.5 font-ui text-xs font-semibold",
                filter === f
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-secondary hover:border-text-secondary",
              )}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions"
              className="h-9 w-48 rounded-lg border border-border bg-surface pl-9 pr-3 font-body text-sm text-text-primary focus:border-accent"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="h-9 rounded-lg border border-border bg-surface px-2 font-ui text-sm text-text-primary focus:border-accent"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="No predictions match"
          description="Try a different filter or search term."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left">
              <thead className="bg-surface-2 font-ui text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Question</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Winner</th>
                  <th className="hidden px-4 py-3 md:table-cell">Participants</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Points</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {visible.map((p) => {
                  const winner = p.outcomes.find((o) => o.id === p.winningOutcomeId);
                  return (
                    <tr key={p.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <Link to={`/predict/${p.id}`} className="font-ui text-sm font-semibold text-text-primary hover:text-accent">
                          {p.question}
                        </Link>
                        <div className="mt-1 sm:hidden">
                          <StatusBadge status={p.status} />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="hidden px-4 py-3 font-body text-sm text-text-secondary md:table-cell">
                        {winner?.label ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 font-body text-sm text-text-secondary md:table-cell">
                        {p.totalParticipants}
                      </td>
                      <td className="hidden px-4 py-3 font-body text-sm text-text-secondary lg:table-cell">
                        {p.totalPoints.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-text-muted">
                        {p.startedAt ? new Date(p.startedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mx-auto block font-ui text-sm font-semibold text-accent hover:underline"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
