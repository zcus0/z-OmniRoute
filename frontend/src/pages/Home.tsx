import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Summary {
  analytics?: {
    totalRequests?: number;
    totalCost?: number;
    totalTokens?: number;
    [k: string]: unknown;
  };
  health?: { status?: string; statusCounts?: Record<string, number>; [k: string]: unknown };
}

export function Home() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Summary["analytics"]>("/api/usage/analytics?range=30d"),
      api<NonNullable<Summary["health"]>>("/api/monitoring/health"),
    ])
      .then(([analytics, health]) => setData({ analytics, health }))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const a = data.analytics ?? {};
  const counts = data.health?.statusCounts ?? {};
  const healthyProviders = Object.entries(counts)
    .filter(([k]) => k === "healthy")
    .reduce((sum, [, v]) => sum + v, 0);
  const totalProviders = Object.values(counts).reduce((sum, v) => sum + v, 0);

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <span className="muted">Requests (30d)</span>
          <strong>{Number(a.totalRequests ?? 0).toLocaleString()}</strong>
        </div>
        <div className="stat">
          <span className="muted">Tokens (30d)</span>
          <strong>{Number(a.totalTokens ?? 0).toLocaleString()}</strong>
        </div>
        <div className="stat">
          <span className="muted">Cost (30d)</span>
          <strong>${Number(a.totalCost ?? 0).toFixed(4)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Providers</span>
          <strong>
            {healthyProviders}
            <span className="muted" style={{ fontSize: 14 }}>
              /{totalProviders}
            </span>
          </strong>
        </div>
      </div>

      <div className="card">
        <h3>Gateway status</h3>
        <span className={data.health?.status === "healthy" ? "ok-badge" : "error"}>
          {data.health?.status ?? "unknown"}
        </span>
        {Object.keys(counts).length > 0 && (
          <p className="muted" style={{ marginTop: 8 }}>
            {Object.entries(counts)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Quick start</h3>
        <p className="muted" style={{ margin: "4px 0 8px" }}>
          Point any OpenAI-compatible tool at the local endpoint:
        </p>
        <pre className="code-block">{`curl http://localhost:${location.port === "5177" ? "3001" : location.port}/v1/chat/completions \\
  -H "Authorization: Bearer <api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'`}</pre>
      </div>
    </>
  );
}
