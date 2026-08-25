import { useState, type FormEvent } from "react";
import { api } from "../api/client";

export function Playground() {
  const [model, setModel] = useState("auto");
  const [prompt, setPrompt] = useState("Hello! Who are you?");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("playground_key") ?? "");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setReply(null);
    setError(null);
    try {
      localStorage.setItem("playground_key", apiKey);
      const res = await api<{ choices?: Array<{ message?: { content?: string } }> }>(
        "/v1/chat/completions",
        {
          method: "POST",
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          body: JSON.stringify({ model: model.trim(), messages: [{ role: "user", content: prompt }] }),
        }
      );
      setReply(res.choices?.[0]?.message?.content ?? JSON.stringify(res));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card playground" onSubmit={submit}>
      <div className="row-form">
        <input
          placeholder="model (auto)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ flex: "0 1 220px" }}
        />
        <input
          placeholder="API key (optional for keyless providers)"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Prompt"
      />
      <div style={{ marginTop: 12 }}>
        <button disabled={busy || !prompt.trim()}>{busy ? "Thinking…" : "Send"}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {reply !== null && <pre className="code-block">{reply}</pre>}
    </form>
  );
}
