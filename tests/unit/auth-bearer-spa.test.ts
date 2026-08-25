import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SignJWT } from "jose";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-auth-token-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET = "test-api-key-secret";

const core = await import("../../src/lib/db/core.ts");
const apiAuth = await import("../../src/shared/utils/apiAuth.ts");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const ORIGINAL_INITIAL_PASSWORD = process.env.INITIAL_PASSWORD;

function makeRequest(token: string | null) {
  return {
    cookies: { get: () => undefined },
    headers: token ? new Headers({ Authorization: `Bearer ${token}` }) : new Headers(),
  };
}

async function mintToken(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
}

test.beforeEach(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  process.env.JWT_SECRET = "test-jwt-secret-for-spa-bearer";
  process.env.INITIAL_PASSWORD = "test-password-123";
});

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  if (ORIGINAL_JWT_SECRET === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  if (ORIGINAL_INITIAL_PASSWORD === undefined) delete process.env.INITIAL_PASSWORD;
  else process.env.INITIAL_PASSWORD = ORIGINAL_INITIAL_PASSWORD;
});

test("isDashboardSessionAuthenticated accepts Authorization: Bearer <dashboard JWT>", async () => {
  const ok = await apiAuth.isDashboardSessionAuthenticated(makeRequest(await mintToken()));
  assert.equal(ok, true);
});

test("isDashboardSessionAuthenticated rejects invalid bearer tokens", async () => {
  assert.equal(await apiAuth.isDashboardSessionAuthenticated(makeRequest("not-a-jwt")), false);
});

test("isDashboardSessionAuthenticated rejects when no cookie and no bearer", async () => {
  assert.equal(await apiAuth.isDashboardSessionAuthenticated(makeRequest(null)), false);
});

test("POST /api/auth/token returns a bearer JWT that grants dashboard access", async () => {
  const { POST } = await import("../../src/app/api/auth/token/route.ts");
  const response = await POST(
    new Request("http://localhost/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test-password-123" }),
    }) as never
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(body.token);

  const ok = await apiAuth.isDashboardSessionAuthenticated(makeRequest(body.token));
  assert.equal(ok, true);
});

test("POST /api/auth/token rejects wrong password with 401 (no stack leak)", async () => {
  const { POST } = await import("../../src/app/api/auth/token/route.ts");
  const response = await POST(
    new Request("http://localhost/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    }) as never
  );
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, "Invalid password");
  assert.ok(!JSON.stringify(body).includes("at /"));
});
