import { useEffect, useState } from "react";
import { getToken, clearToken } from "./api/client";
import { Login } from "./pages/Login";
import { Keys } from "./pages/Keys";
import { Providers } from "./pages/Providers";
import { Models } from "./pages/Models";
import { Usage } from "./pages/Usage";
import { Health } from "./pages/Health";

const TABS = {
  "#keys": { label: "API Keys", el: Keys },
  "#providers": { label: "Providers", el: Providers },
  "#models": { label: "Models", el: Models },
  "#usage": { label: "Usage", el: Usage },
  "#health": { label: "Health", el: Health },
} as const;

function currentTab(): keyof typeof TABS {
  const hash = location.hash as keyof typeof TABS;
  return hash in TABS ? hash : "#keys";
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [tab, setTab] = useState(currentTab());

  useEffect(() => {
    const onHash = () => setTab(currentTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const Page = TABS[tab].el;
  return (
    <>
      <header>
        <h1>OmniRoute</h1>
        <nav>
          {(Object.keys(TABS) as Array<keyof typeof TABS>).map((k) => (
            <a key={k} href={k} className={tab === k ? "active" : ""}>
              {TABS[k].label}
            </a>
          ))}
        </nav>
        <button className="ghost" onClick={() => { clearToken(); setAuthed(false); }}>
          Sign out
        </button>
      </header>
      <main>
        <Page />
      </main>
    </>
  );
}
