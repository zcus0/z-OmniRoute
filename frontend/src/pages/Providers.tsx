import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Connection {
  id: string;
  provider: string;
  name?: string;
  apiKey?: string;
  testStatus?: string;
  priority?: number;
  defaultModel?: string;
  [k: string]: unknown;
}

export function Providers() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ provider: "", apiKey: "", name: "" });

  async function load() {
    try {
      const res = await api<{ connections: Connection[] }>("/api/providers");
      setConnections(res.connections ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider || !form.apiKey) return;
    setBusy(true);
    try {
      await api("/api/providers", {
        method: "POST",
        body: JSON.stringify({
          provider: form.provider.trim(),
          apiKey: form.apiKey.trim(),
          ...(form.name && { name: form.name.trim() }),
        }),
      });
      setForm({ provider: "", apiKey: "", name: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeConnection(id: string) {
    setBusy(true);
    try {
      await api("/api/providers", {
        method: "DELETE",
        body: JSON.stringify({ ids: [id] }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <p className="error">{error}</p>}

      <form onSubmit={addConnection} className="row-form">
        <input
          placeholder="provider (e.g. openai)"
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
        />
        <input
          placeholder="API key"
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
        />
        <input
          placeholder="label (optional)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <button disabled={busy || !form.provider || !form.apiKey}>Add</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Name</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {connections.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No provider connections yet.
              </td>
            </tr>
          )}
          {connections.map((c) => (
            <tr key={c.id}>
              <td>{c.provider}</td>
              <td>{String(c.name ?? "—")}</td>
              <td className={c.testStatus === "unavailable" ? "muted" : "ok-badge"}>
                {String(c.testStatus ?? "unknown")}
              </td>
              <td>
                <button className="ghost" disabled={busy} onClick={() => removeConnection(c.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
