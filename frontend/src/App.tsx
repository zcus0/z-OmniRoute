import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { getToken, clearToken } from "./api/client";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Keys } from "./pages/Keys";
import { Providers } from "./pages/Providers";
import { Models } from "./pages/Models";
import { Combos } from "./pages/Combos";
import { Usage } from "./pages/Usage";
import { Logs } from "./pages/Logs";
import { Health } from "./pages/Health";
import { Playground } from "./pages/Playground";
import OmniRouteLogo from "./components/OmniRouteLogo";

const APP_VERSION = "3.8.51";

/* ── Sidebar catalog — ported from shared/constants/sidebarVisibility ── */

type PageDef = {
  id: string;
  hash: string;
  label: string;
  subtitle: string;
  desc: string;
  icon: string;
  accent: string;
  el: ComponentType;
};

type Group = { type: "group"; id: string; title: string; items: PageDef[] };
type Child = PageDef | Group;

type Section = {
  id: string;
  title?: string;
  showTitle?: boolean;
  children: Child[];
};

function page(
  id: string,
  hash: string,
  label: string,
  subtitle: string,
  desc: string,
  icon: string,
  accent: string,
  el: ComponentType
): PageDef {
  return { id, hash, label, subtitle, desc, icon, accent, el };
}

const PAGES: Section[] = [
  {
    id: "home",
    showTitle: false,
    children: [
      page(
        "home",
        "#home",
        "Home",
        "Dashboard overview",
        "Welcome to OmniRoute",
        "home",
        "#60A5FA",
        Home
      ),
    ],
  },
  {
    id: "omni-proxy",
    title: "OmniProxy",
    children: [
      page(
        "api-manager",
        "#keys",
        "API Keys",
        "Manage API keys and access",
        "Manage API keys and access control for your OmniRoute instance",
        "vpn_key",
        "#F59E0B",
        Keys
      ),
      page(
        "providers",
        "#providers",
        "Providers",
        "Manage AI providers",
        "Manage your AI provider connections",
        "dns",
        "#818CF8",
        Providers
      ),
      page(
        "models",
        "#models",
        "Models",
        "Models exposed on /v1",
        "Models exposed on the OpenAI-compatible /v1 surface",
        "neurology",
        "#38BDF8",
        Models
      ),
      page(
        "combos",
        "#combos",
        "Combos",
        "Group providers for failover",
        "Model combos with fallback",
        "layers",
        "#A855F7",
        Combos
      ),
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    children: [
      page(
        "analytics",
        "#usage",
        "Usage",
        "Traffic and usage stats",
        "Charts, trends, and evaluation insights",
        "analytics",
        "#06B6D4",
        Usage
      ),
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring",
    children: [
      page(
        "logs",
        "#logs",
        "Logs",
        "Application logs",
        "Real-time request logs, error traces, and streaming event inspector",
        "description",
        "#CBD5E1",
        Logs
      ),
      {
        type: "group",
        id: "system",
        title: "System",
        items: [
          page(
            "health",
            "#health",
            "Health",
            "System health check",
            "System health overview: providers, circuit breakers, rate limits, and database",
            "health_and_safety",
            "#EF4444",
            Health
          ),
        ],
      },
    ],
  },
  {
    id: "devtools",
    title: "Dev Tools",
    children: [
      page(
        "playground",
        "#playground",
        "Playground",
        "Test prompts live",
        "Test prompts interactively with live provider responses and format inspection",
        "science",
        "#EAB308",
        Playground
      ),
    ],
  },
];

const ALL_PAGES: PageDef[] = PAGES.flatMap((s) =>
  s.children.flatMap((c) => ("type" in c ? c.items : [c]))
);

function pageByHash(hash: string): PageDef {
  return ALL_PAGES.find((p) => p.hash === hash) ?? ALL_PAGES[0];
}

/* ── Persisted sidebar state (same storage keys as the original) ── */

const EXPANDED_KEY = "sidebar-expanded-sections";
const PINNED_KEY = "sidebar-pinned-sections";
const COLLAPSED_KEY = "sidebar-collapsed";
const THEME_KEY = "omniroute-theme";
const DEFAULT_EXPANDED = "omni-proxy";

function loadList(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as string[];
    }
  } catch {}
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

/* ── Command palette (Ctrl+K quick nav) ── */

function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_PAGES;
    return ALL_PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    );
  }, [query]);

  if (!open) return null;

  return (
    <div className="palette-overlay" onMouseDown={onClose}>
      <div className="palette" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input-row">
          <span className="msr">search</span>
          <input
            ref={inputRef}
            value={query}
            placeholder="Search pages…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                window.location.hash = results[0].hash;
                onClose();
              }
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <div className="palette-list">
          {results.length === 0 && <p className="palette-empty">No results</p>}
          {results.map((p) => (
            <a
              key={p.id}
              className="palette-item"
              href={p.hash}
              onClick={onClose}
              style={{ ["--nav-accent" as string]: p.accent }}
            >
              <span className="msr">{p.icon}</span>
              <span className="nav-link-labels">
                <span className="nav-link-label">{p.label}</span>
                <span className="nav-link-sub">{p.subtitle}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Confirm modal (Restart / Shutdown, like the original footer) ── */

function ConfirmModal({
  open,
  variant,
  title,
  message,
  confirmText,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  variant: "warning" | "danger";
  title: string;
  message: string;
  confirmText: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="palette-overlay"
      style={{ alignItems: "center", paddingTop: 0 }}
      onMouseDown={onClose}
    >
      <div
        className="palette"
        style={{ maxWidth: 400 }}
        role="dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {message}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              className="primary"
              style={
                variant === "danger"
                  ? { background: "var(--color-error)" }
                  : { background: "var(--color-warning)" }
              }
              onClick={onConfirm}
              disabled={busy}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Footer buttons (Restart / Shutdown) ── */

function SidebarFooterButtons({ collapsed }: { collapsed: boolean }) {
  const [modal, setModal] = useState<null | "restart" | "shutdown">(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: "restart" | "shutdown") => {
    setBusy(true);
    try {
      await fetch(`/api/system/${action}`, { method: "POST" });
    } catch {
      /* endpoint unavailable in this deployment */
    } finally {
      setBusy(false);
      setModal(null);
    }
  };

  return (
    <>
      <button className="footer-btn restart" onClick={() => setModal("restart")} title="Restart">
        <span className="msr">restart_alt</span>
        {!collapsed && <span className="label">Restart</span>}
      </button>
      <button className="footer-btn shutdown" onClick={() => setModal("shutdown")} title="Shutdown">
        <span className="msr">power_settings_new</span>
        {!collapsed && <span className="label">Shutdown</span>}
      </button>
      <ConfirmModal
        open={modal !== null}
        variant={modal === "shutdown" ? "danger" : "warning"}
        title={modal === "shutdown" ? "Shutdown server?" : "Restart server?"}
        message={
          modal === "shutdown"
            ? "The gateway will stop serving requests until manually started again."
            : "The gateway will briefly go offline while it restarts."
        }
        confirmText={modal === "shutdown" ? "Shutdown" : "Restart"}
        busy={busy}
        onConfirm={() => modal && run(modal)}
        onClose={() => setModal(null)}
      />
    </>
  );
}

/* ── Sidebar ── */

function Sidebar(props: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeHash: string;
  expanded: Set<string>;
  pinned: Set<string>;
  onToggleSection: (id: string) => void;
  onTogglePin: (id: string) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
}) {
  const {
    collapsed,
    onToggleCollapse,
    activeHash,
    expanded,
    pinned,
    onToggleSection,
    onTogglePin,
    searchQuery,
    onSearch,
  } = props;
  const searching = searchQuery.trim().length > 0;
  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);
  const asideRef = useRef<HTMLElement>(null);

  const visiblePages = useMemo(() => {
    if (!searching) return null;
    const q = searchQuery.trim().toLowerCase();
    return ALL_PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    );
  }, [searching, searchQuery]);

  const renderLink = (item: PageDef) => (
    <a
      key={item.id}
      href={item.hash}
      className={`nav-link${activeHash === item.hash ? " active" : ""}`}
      style={{ ["--nav-accent" as string]: item.accent }}
      onClick={() => setHovered(null)}
      onMouseEnter={(e) => {
        if (!collapsed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setHovered({
          label: item.label,
          x: (asideRef.current?.getBoundingClientRect().right ?? 64) + 8,
          y: rect.top + rect.height / 2,
        });
      }}
      onMouseLeave={() => setHovered(null)}
    >
      <span className={`msr${activeHash === item.hash ? " fill-1" : ""}`}>{item.icon}</span>
      {!collapsed && (
        <span className="nav-link-labels">
          <span className="nav-link-label">{item.label}</span>
          <span className="nav-link-sub">{item.subtitle}</span>
        </span>
      )}
    </a>
  );

  return (
    <>
      <aside ref={asideRef} className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-chrome">
          <div className="traffic-lights" aria-hidden="true">
            <div className="traffic-light red" />
            <div className="traffic-light yellow" />
            <div className="traffic-light green" />
          </div>
          {!collapsed && <div style={{ flex: 1 }} />}
          <button
            className="collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <span className="msr">{collapsed ? "chevron_right" : "chevron_left"}</span>
          </button>
        </div>

        <div style={{ padding: collapsed ? "12px 8px" : "12px 16px" }}>
          <a href="#home" className="logo-row" style={{ padding: 0 }}>
            <div className="logo-mark">
              <OmniRouteLogo size={18} />
            </div>
            {!collapsed && (
              <div className="logo-text">
                <h1 className="logo-name">OmniRoute</h1>
                <span className="logo-ver">v{APP_VERSION}</span>
              </div>
            )}
          </a>
        </div>

        {!collapsed && (
          <div className="side-search">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search"
            />
          </div>
        )}

        <nav className="sidenav" aria-label="Main navigation">
          {visiblePages !== null && visiblePages.length === 0 && (
            <p className="nav-noresults">No results</p>
          )}

          {PAGES.map((section, idx) => {
            const items = section.children.flatMap((c) => ("type" in c ? c.items : [c]));
            if (visiblePages !== null) {
              const filtered = items.filter((i) => visiblePages.includes(i));
              if (filtered.length === 0) return null;
              return <div key={section.id}>{filtered.map(renderLink)}</div>;
            }

            const isExpanded = expanded.has(section.id) || section.showTitle === false;
            const isPinned = pinned.has(section.id);

            if (collapsed) {
              return (
                <div key={section.id} className="nav-section-flat">
                  {items.map(renderLink)}
                </div>
              );
            }

            if (section.showTitle === false) {
              return (
                <div
                  key={section.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    marginTop: idx === 0 ? 0 : 4,
                  }}
                >
                  {(section.children as PageDef[]).map(renderLink)}
                </div>
              );
            }

            return (
              <div key={section.id} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                <div
                  className="nav-section-head"
                  onClick={() => onToggleSection(section.id)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <span className="nav-section-title">{section.title}</span>
                  <button
                    className={`nav-pin${isPinned ? " pinned" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(section.id);
                    }}
                    title={isPinned ? "Unpin section" : "Pin section open"}
                  >
                    <span
                      className="msr"
                      style={isPinned ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      push_pin
                    </span>
                  </button>
                  <span className={`msr nav-chevron${isExpanded ? " open" : ""}`}>
                    expand_more
                  </span>
                </div>

                {isExpanded && (
                  <div
                    style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {section.children.map((child) =>
                      "type" in child ? (
                        <div key={child.id}>
                          <div className="nav-group-divider">
                            <span className="nav-group-title">{child.title}</span>
                          </div>
                          {child.items.map(renderLink)}
                        </div>
                      ) : (
                        renderLink(child)
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <SidebarFooterButtons collapsed={collapsed} />
        </div>
      </aside>

      {collapsed && hovered && (
        <div className="nav-tooltip" style={{ left: hovered.x, top: hovered.y }}>
          <div className="nav-tooltip-arrow" />
          <div className="nav-tooltip-body">{hovered.label}</div>
        </div>
      )}
    </>
  );
}

/* ── Root App ── */

function currentHash(): string {
  return window.location.hash || "#home";
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [activeHash, setActiveHash] = useState(currentHash());
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "true"
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(loadList(EXPANDED_KEY, [DEFAULT_EXPANDED]))
  );
  const [pinned, setPinned] = useState<Set<string>>(() => new Set(loadList(PINNED_KEY, [])));
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const onHash = () => setActiveHash(currentHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveJson(EXPANDED_KEY, [...next]);
      return next;
    });
  }, []);

  const togglePin = useCallback(
    (id: string) => {
      const next = new Set(pinned);
      let nextExpanded = expanded;
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        nextExpanded = new Set(expanded).add(id);
      }
      setPinned(next);
      setExpanded(nextExpanded);
      saveJson(PINNED_KEY, [...next]);
      saveJson(EXPANDED_KEY, [...nextExpanded]);
    },
    [pinned, expanded]
  );

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  }, []);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const pageDef = pageByHash(activeHash);

  return (
    <div className="shell">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        activeHash={activeHash}
        expanded={expanded}
        pinned={pinned}
        onToggleSection={toggleSection}
        onTogglePin={togglePin}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
          <div className="sidebar-mobile">
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
              activeHash={activeHash}
              expanded={new Set(PAGES.map((s) => s.id))}
              pinned={pinned}
              onToggleSection={toggleSection}
              onTogglePin={togglePin}
              searchQuery=""
              onSearch={setSearchQuery}
            />
          </div>
        </>
      )}

      {/* Main column */}
      <div className="content-col">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <span className="msr">menu</span>
            </button>
            <div className="topbar-icon">
              <span className="msr">{pageDef.icon}</span>
            </div>
            <div>
              <h1>{pageDef.label}</h1>
              {pageDef.desc && <div className="page-desc">{pageDef.desc}</div>}
            </div>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="quick-nav"
              onClick={() => setPaletteOpen(true)}
              title="Quick navigation"
            >
              <span className="msr">search</span>
              <span>Quick nav</span>
              <kbd>{navigator.platform.includes("Mac") ? "⌘K" : "Ctrl+K"}</kbd>
            </button>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              <span className="msr">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
            </button>
            <button
              className="icon-btn logout"
              onClick={() => {
                clearToken();
                setAuthed(false);
              }}
              title="Logout"
              aria-label="Logout"
            >
              <span className="msr">logout</span>
            </button>
          </div>
        </header>

        <div className="content-scroll">
          <div className="content-inner">
            <pageDef.el />
          </div>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
