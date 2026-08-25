import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SignJWT } from "jose";
import {
  ensurePersistentManagementPasswordHash,
  getStoredManagementPassword,
  verifyManagementPassword,
} from "@/lib/auth/managementPassword";
import { isFeatureFlagEnabled } from "@/shared/utils/featureFlags";
import { getCachedSettings } from "@/lib/db/settings";
import { loginSchema } from "@/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { checkLoginGuard, clearLoginAttempts, recordLoginFailure } from "@/server/auth/loginGuard";

/**
 * Bearer-token login for decoupled SPA clients (frontend/ dashboard).
 *
 * Exchanges the management password for a dashboard JWT returned in the JSON
 * body — the same JWT the cookie-based /api/auth/login sets as `auth_token`,
 * so every MANAGEMENT route that accepts the cookie session accepts
 * `Authorization: Bearer <token>` too (see isDashboardSessionAuthenticated).
 *
 * SECURITY: mirrors /api/auth/login guard-for-guard (brute-force lockout,
 * OIDC-disable, persistent-password requirement). Never widens access: the
 * token grants exactly the dashboard session scope, nothing more.
 */

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || "");
}

export async function POST(request: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "Server misconfigured: JWT_SECRET not set." },
      { status: 500 }
    );
  }

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } },
      { status: 400 }
    );
  }

  const validation = validateBody(loginSchema, rawBody);
  if (isValidationFailure(validation)) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const password = typeof validation.data.password === "string" ? validation.data.password : "";
  if (!password) {
    return NextResponse.json({ error: "Invalid password payload" }, { status: 400 });
  }

  const settings = await getCachedSettings();
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;

  const oidcDisabledPassword =
    settings.oidcEnabled === true &&
    (settings.oidcDisablePasswordLogin === true ||
      isFeatureFlagEnabled("OMNIROUTE_OIDC_DISABLE_PASSWORD_LOGIN"));

  if (oidcDisabledPassword) {
    return NextResponse.json(
      { error: "Password login is disabled when OIDC is active." },
      { status: 403 }
    );
  }

  const bruteForceEnabled = settings.bruteForceProtection !== false;
  const guardCheck = checkLoginGuard(clientIp, { enabled: bruteForceEnabled });
  if (!guardCheck.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(guardCheck.retryAfterSeconds || 60) } }
    );
  }

  const passwordState = await ensurePersistentManagementPasswordHash({
    settings,
    source: "auth.token",
  });
  const storedHash = getStoredManagementPassword(passwordState.settings);
  if (!storedHash) {
    return NextResponse.json(
      { error: "No password configured. Complete onboarding first.", needsSetup: true },
      { status: 403 }
    );
  }

  if (!(await verifyManagementPassword(password, storedHash))) {
    recordLoginFailure(clientIp, { enabled: bruteForceEnabled });
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  clearLoginAttempts(clientIp);

  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getJwtSecret());

  return NextResponse.json({ success: true, token });
}
