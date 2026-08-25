import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Health {
  status?: string;
  providers?: Array<{ name?: string; status?: string; [k: string]: unknown }>;
  statusCounts?: Record<string, number>;
  [k: string]: unknown;
}

export function Health() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Health>("/api/monitoring/health")
      .then(setHealth)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!health) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Overall</h3>
        <span className={health.status === "healthy" ? "ok-badge" : "error"}>{health.status ?? "unknown"}</span>
      </div>
      {health.statusCounts && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Provider status counts</h3>
          <table>
            <tbody>
              {Object.entries(health.statusCounts).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {Array.isArray(health.providers) && health.providers.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {health.providers.map((p, i) => (
              <tr key={i}>
                <td>{String(p.name ?? i)}</td>
                <td className={p.status === "healthy" || p.status === "idle" ? "ok-badge" : ""}>
                  {String(p.status ?? "unknown")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
