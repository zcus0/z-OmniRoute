#!/usr/bin/env node
/**
 * Standalone backend boot (no Next.js): env bootstrap → DB/engine register()
 * → Express server mounting every src/app/api route.ts.
 *
 * Usage: node --import tsx/esm --import ./scripts/dev/register-shim.mjs scripts/dev/run-server.mjs [dev|start]
 */

import fs from "node:fs";
import path from "node:path";
import { bootstrapEnv } from "../build/bootstrap-env.mjs";
import { resolveRuntimePorts, withRuntimePortEnv } from "../build/runtime-env.mjs";
import { ensureNativeSqlite } from "./ensure-native-sqlite.mjs";
import { ensurePeerStampToken } from "./peer-stamp.mjs";
import { createSystemdNotifier } from "./systemd-notify.mjs";

// Pre-read DATA_DIR from local .env before bootstrap resolves paths
if (!process.env.DATA_DIR) {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    const match = raw.match(/^DATA_DIR=(.+)$/m);
    if (match?.[1]?.trim()) process.env.DATA_DIR = match[1].trim();
  } catch {
    /* no .env — bootstrap falls back to the default */
  }
}

const mode = process.argv[2] === "start" ? "start" : "dev";
if (mode === "dev") ensureNativeSqlite();

const bootstrappedEnv = bootstrapEnv();
const runtimePorts = resolveRuntimePorts(bootstrappedEnv);
const mergedEnv = withRuntimePortEnv(bootstrappedEnv, runtimePorts);
for (const [key, value] of Object.entries(mergedEnv)) {
  if (value !== undefined) process.env[key] = value;
}

process.env.NODE_ENV = mode === "dev" ? "development" : "production";
process.env.OMNIROUTE_INTERNAL_SCHEME = "http";
ensurePeerStampToken();
createSystemdNotifier();

// Full engine boot: DB migrations, schedulers, warmups (same as the Next
// instrumentation hook ran).
const { registerNodejs } = await import("../../src/instrumentation-node.ts");
await registerNodejs();

const { createServer } = await import("../../server/express/expressServer.mjs");
const { app, routeCount } = await createServer();

const port = Number(process.env.PORT || runtimePorts.basePort || 20128);
const hostname = process.env.HOST || "0.0.0.0";
// ponytail: requestTimeout=0 allows arbitrarily long SSE streams; revisit
// with an idle-timeout when a slowloris story is needed.
const server = app.listen(port, hostname, () => {
  console.log(`[HTTP] standalone Express server listening on http://${hostname}:${port} (${routeCount} API routes)`);
});
server.requestTimeout = 0;

const shutdown = (signal) => {
  console.log(`\n[HTTP] ${signal} received — closing`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
