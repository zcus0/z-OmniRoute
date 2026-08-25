import { registerHooks } from "node:module";

const SHIM_URL = new URL("../../server/express/next-server-shim.mjs", import.meta.url).href;

// Synchronous resolve hook (registerHooks) so it chains ahead of tsx's own
// hooks — the async module.register() variant never sees these specifiers.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server" || specifier === "next/headers") {
      return { shortCircuit: true, url: SHIM_URL, format: "module" };
    }
    return nextResolve(specifier, context);
  },
});
