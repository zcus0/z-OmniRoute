import { useEffect, useState } from "react";
import { api } from "../api/client";

interface RegisteredKey {
  id?: string | number;
  name?: string;
  key?: string;
  enabled?: boolean;
  [k: string]: unknown;
}

export function Keys() {
  const [keys, setKeys] = useState<RegisteredKey[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ keys: RegisteredKey[] }>("/v1/registered-keys")
      .then((res) => setKeys(res.keys ?? []))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Key</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {keys.length === 0 && (
          <tr>
            <td colSpan={3} className="muted">
              No registered keys.
            </td>
          </tr>
        )}
        {keys.map((k, i) => (
          <tr key={String(k.id ?? i)}>
            <td>{String(k.name ?? "—")}</td>
            <td className="muted">{maskKey(String(k.key ?? ""))}</td>
            <td className={k.enabled === false ? "muted" : "ok-badge"}>
              {k.enabled === false ? "disabled" : "active"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}
