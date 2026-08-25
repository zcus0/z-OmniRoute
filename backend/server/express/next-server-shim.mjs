/**
 * Minimal `next/server` + `next/headers` shim for the standalone Express
 * runtime (plain JS — loaded untranspiled).
 *
 * Route handlers only lean on: NextResponse.json(body, {status, headers}),
 * the NextRequest type, after(), and an await-able cookies()/headers()
 * backed by the Express req/res pair via AsyncLocalStorage.
 */

export class NextResponse extends Response {
  static json(body, init = {}) {
    return Response.json(body, init);
  }
}

export class NextRequest extends Request {}

export const unstable_noStore = () => {};
export const revalidatePath = () => {};
export const revalidateTag = () => {};

// Run the callback post-response; side effects are preserved best-effort.
export const after = (fn) => {
  if (typeof fn === "function") setTimeout(() => Promise.resolve().then(fn).catch(() => {}), 0);
};
export const connection = async () => {};

function currentCtx() {
  return globalThis.__OMNIROUTE_REQ_CTX__?.getStore?.() ?? null;
}

function serializeCookie(name, value, opts = {}) {
  let out = `${name}=${encodeURIComponent(value)}`;
  out += `; Path=${opts.path ?? "/"}`;
  if (opts.maxAge !== undefined) out += `; Max-Age=${Number(opts.maxAge)}`;
  if (opts.httpOnly) out += "; HttpOnly";
  if (opts.secure) out += "; Secure";
  if (opts.sameSite)
    out += `; SameSite=${String(opts.sameSite).replace(/^./, (c) => c.toUpperCase())}`;
  return out;
}

export async function cookies() {
  const ctx = currentCtx();
  if (!ctx) throw new Error("cookies() called outside a request context");
  const parse = () =>
    Object.fromEntries(
      String(ctx.req.headers.cookie ?? "")
        .split(";")
        .filter(Boolean)
        .map((p) => {
          const i = p.indexOf("=");
          return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())];
        }),
    );
  return {
    get(name) {
      const v = parse()[name];
      return v === undefined ? undefined : { name, value: v };
    },
    getAll() {
      return Object.entries(parse()).map(([name, value]) => ({ name, value }));
    },
    set(...args) {
      const [name, second] = args;
      const value = typeof second === "string" ? second : String(second?.value ?? "");
      const opts = typeof second === "object" && second ? second : {};
      ctx.cookies.push(serializeCookie(name, value, opts));
    },
    delete(name) {
      ctx.cookies.push(`${name}=; Path=/; Max-Age=0`);
    },
  };
}

export async function headers() {
  const ctx = currentCtx();
  if (!ctx) throw new Error("headers() called outside a request context");
  return {
    get(name) {
      const v = ctx.req.headers[name.toLowerCase()];
      return v === undefined ? null : Array.isArray(v) ? v.join(",") : v;
    },
  };
}

export default { NextResponse, NextRequest };
