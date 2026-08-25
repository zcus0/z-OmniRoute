import { useEffect, useState } from "react";
import { api } from "../api/client";

interface UsageSummary {
  totalRequests?: number;
  totalCost?: number;
  totalTokens?: number;
  byProvider?: Array<{ provider?: string; requests?: number; cost?: number }>;
  [k: string]: unknown;
}

export function Usage() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<UsageSummary>("/api/usage/analytics?range=30d")
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <span className="muted">Requests (30d)</span>
          <strong>{fmt(data.totalRequests)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Cost (30d)</span>
          <strong>${Number(data.totalCost ?? 0).toFixed(4)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Tokens (30d)</span>
          <strong>{fmt(data.totalTokens)}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Requests</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {(data.byProvider ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                No usage recorded yet.
              </td>
            </tr>
          )}
          {(data.byProvider ?? []).map((p, i) => (
            <tr key={String(p.provider ?? i)}>
              <td>{String(p.provider ?? "—")}</td>
              <td>{fmt(p.requests)}</td>
              <td>${Number(p.cost ?? 0).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function fmt(n: number | undefined): string {
  return Number(n ?? 0).toLocaleString();
}
