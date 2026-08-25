import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Combo {
  id?: string | number;
  name?: string;
  strategy?: string;
  enabled?: boolean;
  targets?: unknown[];
  description?: string;
  [k: string]: unknown;
}

export function Combos() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ combos: Combo[] }>("/api/combos?limit=200")
      .then((res) => setCombos(res.combos ?? []))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Strategy</th>
          <th>Targets</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {combos.length === 0 && (
          <tr>
            <td colSpan={4} className="muted">
              No combos configured.
            </td>
          </tr>
        )}
        {combos.map((c, i) => (
          <tr key={String(c.id ?? i)}>
            <td>{String(c.name ?? "—")}</td>
            <td className="muted">{String(c.strategy ?? "—")}</td>
            <td>{Array.isArray(c.targets) ? c.targets.length : "—"}</td>
            <td className={c.enabled === false ? "muted" : "ok-badge"}>
              {c.enabled === false ? "disabled" : "enabled"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
