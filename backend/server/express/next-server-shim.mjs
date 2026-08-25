/**
 * Minimal `next/server` shim for the standalone Express runtime.
 *
 * The API route handlers under src/app/api/** were written for the Next.js App
 * Router, but they only lean on a tiny surface: `NextResponse.json(body,
 * { status, headers })` and the `NextRequest` type. Both map 1:1 onto the Web
 * standard `Request`/`Response` that the Express adapter feeds them.
 *
 * Anything beyond this surface (cookies()/headers() request-scoped stores)
 * has no meaning outside Next's async-local context and throws loudly instead
 * of misbehaving silently.
 */

export class NextResponse extends Response {
  static json(body, init = {}) {
    return Response.json(body, init);
  }
}

export class NextRequest extends Request {}

export const cookies = () => {
  throw new Error(
    "next/headers cookies() is not available in the standalone Express server",
  );
};

export const headers = () => {
  throw new Error(
    "next/headers headers() is not available in the standalone Express server",
  );
};

export const unstable_noStore = () => {};

// Next post-response helpers — no-op under the standalone server (nothing to
// revalidate); `after` still runs the callback so side effects aren't lost.
export const after = (fn) => {
  if (typeof fn === "function") setTimeout(() => Promise.resolve().then(fn).catch(() => {}), 0);
};
export const connection = async () => {};
export const revalidatePath = () => {};
export const revalidateTag = () => {};

export default { NextResponse, NextRequest };
