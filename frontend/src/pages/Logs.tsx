import { useEffect, useState } from "react";
import { api } from "../api/client";

type Row = Record<string, unknown>;

function pick(row: Row, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "—";
}

export function Logs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Row[]>("/api/usage/call-logs?limit=100&excludeTests=1")
      .then((res) => setRows(Array.isArray(res) ? res : []))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Model</th>
          <th>Provider</th>
          <th>Status</th>
          <th>Latency</th>
          <th>Tokens</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="muted">
              No requests logged yet.
            </td>
          </tr>
        )}
        {rows.map((r, i) => {
          const ts = Number(pick(r, ["timestamp", "createdAt", "created_at"]).replace("—", "")) || 0;
          const time = ts
            ? new Date(ts < 1e12 ? ts * 1000 : ts).toLocaleTimeString()
            : pick(r, ["time", "timestamp", "createdAt"]);
          const status = pick(r, ["status", "statusCode", "state"]);
          const ok = /^(2\d\d|success|ok|completed)$/i.test(status);
          return (
            <tr key={i}>
              <td className="muted">{time}</td>
              <td>{pick(r, ["model", "modelName"])}</td>
              <td className="muted">{pick(r, ["providerName", "provider", "providerId"])}</td>
              <td className={ok ? "ok-badge" : status === "—" ? "muted" : "error"}>{status}</td>
              <td>{pick(r, ["latencyMs", "latency_ms", "durationMs"])}</td>
              <td className="muted">{pick(r, ["totalTokens", "total_tokens", "tokens"])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
