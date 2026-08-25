import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Model {
  id: string;
  owned_by?: string;
}

export function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // OpenAI-compatible list endpoint.
    api<{ data: Model[] }>("/v1/models")
      .then((res) => setModels(res.data ?? []))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>Provider</th>
        </tr>
      </thead>
      <tbody>
        {models.map((m) => (
          <tr key={m.id}>
            <td>{m.id}</td>
            <td className="muted">{m.owned_by ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
