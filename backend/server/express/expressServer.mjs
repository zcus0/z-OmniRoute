/**
 * Standalone HTTP server (Express) — no Next.js at runtime.
 *
 * Auto-discovers every route.ts under src/app/api and mounts it with a thin
 * Web-Request/Response adapter, so the existing handler code (and the
 * open-sse engine behind it) runs untouched. `next/server` imports inside
 * those files are aliased to a local shim via scripts/dev/register-shim.mjs.
 *
 * ponytail: mounts the full /api surface including dashboard management
 * routes; when the legacy dashboard is physically removed, this shrinks
 * automatically (discovery is filesystem-driven).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import express from "express";
import { AsyncLocalStorage } from "node:async_hooks";

// Request-scoped context bridging Next's cookies()/headers() shims to the
// Express req/res pair handling the current call.
const reqCtx = new AsyncLocalStorage();
globalThis.__OMNIROUTE_REQ_CTX__ = reqCtx;

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apiDir = path.join(backendRoot, "src", "app", "api");

const importFromSrc = (rel) => import(pathToFileURL(path.join(backendRoot, rel)).href);

// ---------------------------------------------------------------------------
// Route discovery
// ---------------------------------------------------------------------------

function discoverRoutes() {
  const routes = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === "route.ts") {
        const rel = path.relative(apiDir, full);
        const segments = rel
          .slice(0, -"/route.ts".length)
          .split(path.sep)
          .filter(Boolean);
        const expressPath =
          "/api/" +
          segments
            .map((seg) => {
              if (/^\[\[\.\..*\]\]$/.test(seg)) return "*splat"; // optional catch-all → required wildcard
              if (seg.startsWith("[...")) return "*splat";
              if (/^\[\[.+\]\]$/.test(seg)) return `:${seg.slice(2, -2)}?`;
              if (seg.startsWith("[") && seg.endsWith("]")) return `:${seg.slice(1, -1)}`;
              return seg;
            })
            .join("/");
        routes.push({ file: full, url: expressPath, staticSegments: segments.filter((s) => !s.startsWith("[")).length });
      }
    }
  };
  walk(apiDir);
  // Deeper/static-first ordering so specific paths win over parametrized ones.
  routes.sort((a, b) => b.staticSegments - a.staticSegments);
  return routes;
}

// ---------------------------------------------------------------------------
// Web Request/Response adapter
// ---------------------------------------------------------------------------

const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "proxy-authenticate", "proxy-authorization", "te", "trailer"]);

function toWebRequest(req, basePath) {
  const url = new URL(req.originalUrl ?? req.url, basePath);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) headers.append(key, v);
  }
  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function sendResponse(res, response, method) {
  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    if (key.toLowerCase() === "set-cookie") res.appendHeader("Set-Cookie", value);
    else res.setHeader(key, value);
  });
  const bodyless = method === "HEAD" || response.status === 204 || response.status === 304;
  res.statusCode = response.status;
  if (!response.body || bodyless) {
    res.end();
    return;
  }
  res.flushHeaders?.();
  const stream = Readable.fromWeb(response.body);
  stream.on("error", () => res.destroy());
  stream.pipe(res);
}

function makeHandler(module, exportName) {
  const handler = module[exportName];
  if (typeof handler !== "function") return null;
  return async (req, res) => {
    const store = { cookies: [] };
    try {
      const response = await reqCtx.run({ req, res, ...store }, async () => {
        const request = toWebRequest(req, process.env.OMNIROUTE_BASE_URL ?? "http://localhost");
        return await handler(request);
      });
      for (const c of store.cookies) res.appendHeader("Set-Cookie", c);
      await sendResponse(res, response, req.method);
    } catch (error) {
      const { sanitizeErrorMessage } = await import(
        pathToFileURL(path.join(backendRoot, "open-sse/utils/error.ts")).href
      );
      console.error(`[HTTP] ${req.method} ${req.url} failed:`, error);
      if (!res.headersSent) {
        res.status(error?.status && Number.isInteger(error.status) ? error.status : 500);
        res.json(buildSafeErrorBody(sanitizeErrorMessage, error));
      } else {
        res.destroy();
      }
    }
  };
}

function buildSafeErrorBody(sanitize, error) {
  let message;
  try {
    message = sanitize(error instanceof Error ? error : String(error));
  } catch {
    message = "Internal Server Error";
  }
  return { error: { message, type: "api_error", code: "internal_error" } };
}

const METHOD_EXPORTS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

// ---------------------------------------------------------------------------
// App assembly
// ---------------------------------------------------------------------------

export async function createServer() {
  const app = express();
  app.disable("x-powered-by");

  // Parity with the Next.js `rewrites` config: expose the OpenAI-compatible
  // plane at both /v1/* and /api/v1/*.
  app.use((req, _res, next) => {
    if (req.url === "/v1" || req.url.startsWith("/v1/") || req.url === "/v1beta" || req.url.startsWith("/v1beta/")) {
      req.url = `/api${req.url}`;
    }
    next();
  });

  const routes = discoverRoutes();

  // Generic CORS preflight fallback for modules that don't export OPTIONS.
  const { CORS_HEADERS } = await importFromSrc("src/shared/utils/cors.ts");
  const mountedOptions = new Set();

  for (const route of routes) {
    let mod;
    try {
      mod = await import(pathToFileURL(route.file).href);
    } catch (error) {
      console.error(`[HTTP] skipping ${route.url}: failed to load route module:`, error?.message ?? error, "\n", String(error?.stack).split("\n").slice(1, 4).join("\n"));
      continue;
    }
    for (const name of METHOD_EXPORTS) {
      if (name === "OPTIONS") {
        const handler = makeHandler(mod, name);
        if (handler) {
          app.options(route.url, handler);
          mountedOptions.add(route.url);
        }
        continue;
      }
      const handler = makeHandler(mod, name);
      if (handler) app[name.toLowerCase()](route.url, handler);
      // Next serves HEAD implicitly from GET.
      if (name === "GET" && handler && typeof mod.HEAD !== "function") {
        app.head(route.url, handler);
      }
    }
  }

  app.options("*splat", (_req, res) => {
    res.set(CORS_HEADERS);
    res.status(204).end();
  });

  return { app, routeCount: routes.length };
}
