import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import { SESSION_COOKIE } from "@/lib/identity";

type V9Sql = ReturnType<typeof neon>;

type V9Global = typeof globalThis & {
  __srikandiV9Sql?: V9Sql;
};

export interface V9LoginContext {
  email: string;
  subjectHash: string;
  ipHash: string;
}

interface V9RequestContext {
  sessionTokenHash?: string;
  authFlow?: "login" | "public-interest" | "public-share";
  loginEmail?: string;
  loginSubjectHash?: string;
  loginIpHash?: string;
  loginUserId?: string;
  shareTokenHash?: string;
  publicInterestName?: string;
  publicInterestPhone?: string;
}

/**
 * One cached Neon HTTP client is shared by warm server instances. The role
 * context is deliberately attached to each statement inside a Neon HTTP
 * transaction, never with session-level SET statements.
 */
function getRawV9Sql(): V9Sql {
  const connectionString = process.env.V9_DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("V9_DATABASE_URL is not configured.");
  }

  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    throw new Error("V9_DATABASE_URL must be a PostgreSQL connection URL.");
  }

  const globalForV9 = globalThis as V9Global;
  if (!globalForV9.__srikandiV9Sql) {
    globalForV9.__srikandiV9Sql = neon(connectionString);
  }

  return globalForV9.__srikandiV9Sql;
}

async function sessionContext(): Promise<V9RequestContext> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    return {
      sessionTokenHash: token
        ? createHash("sha256").update(token).digest("hex")
        : "",
    };
  } catch {
    // Public/static rendering has no authenticated request context.
    return { sessionTokenHash: "" };
  }
}

function contextualSql(
  raw: V9Sql,
  resolveContext: () => Promise<V9RequestContext>,
): V9Sql {
  return new Proxy(raw, {
    apply(target, _thisArg, args: Parameters<V9Sql>) {
      return (async () => {
        const context = await resolveContext();
        const query = Reflect.apply(target, target, args) as Promise<unknown>;
        const contextQuery = target`
          SELECT
            set_config('v9.session_token_hash', ${context.sessionTokenHash ?? ""}, true),
            set_config('v9.auth_flow', ${context.authFlow ?? ""}, true),
            set_config('v9.login_email', ${context.loginEmail ?? ""}, true),
            set_config('v9.login_subject_hash', ${context.loginSubjectHash ?? ""}, true),
            set_config('v9.login_ip_hash', ${context.loginIpHash ?? ""}, true),
            set_config('v9.login_user_id', ${context.loginUserId ?? ""}, true),
            set_config('v9.share_token_hash', ${context.shareTokenHash ?? ""}, true),
            set_config('v9.public_interest_name', ${context.publicInterestName ?? ""}, true),
            set_config('v9.public_interest_phone', ${context.publicInterestPhone ?? ""}, true)
        `;
        const [, result] = await target.transaction([contextQuery, query]);
        return result;
      })();
    },
  }) as V9Sql;
}

/**
 * Authenticated application query. The opaque cookie is hashed server-side;
 * the raw session token is never sent to PostgreSQL or logged.
 */
export function getV9Sql(): V9Sql {
  return contextualSql(getRawV9Sql(), sessionContext);
}

/** Pre-authentication query scope used only by the email/password login flow. */
export function getV9LoginSql(context: V9LoginContext): V9Sql {
  return contextualSql(getRawV9Sql(), async () => ({
    authFlow: "login",
    loginEmail: context.email.trim().toLowerCase(),
    loginSubjectHash: context.subjectHash,
    loginIpHash: context.ipHash,
  }));
}

/**
 * Post-password-verification scope. The account ID is passed only after the
 * server has verified the supplied password against the stored password hash.
 */
export function getV9AuthenticatedLoginSql(
  context: V9LoginContext & { userId: string },
): V9Sql {
  return contextualSql(getRawV9Sql(), async () => ({
    authFlow: "login",
    loginEmail: context.email.trim().toLowerCase(),
    loginSubjectHash: context.subjectHash,
    loginIpHash: context.ipHash,
    loginUserId: context.userId,
  }));
}

/** Narrow unauthenticated insert scope for the public membership-interest form. */
export function getV9PublicInterestSql(context: { name: string; phone: string }): V9Sql {
  return contextualSql(getRawV9Sql(), async () => ({
    authFlow: "public-interest",
    publicInterestName: context.name.trim().toLowerCase(),
    publicInterestPhone: context.phone.replace(/\\D/g, ""),
  }));
}

/** Narrow unauthenticated scope for a single, unguessable file-share token. */
export function getV9PublicShareSql(tokenHash: string): V9Sql {
  if (!/^[a-f0-9]{64}$/i.test(tokenHash)) {
    throw new Error("A valid file-share token hash is required.");
  }

  return contextualSql(getRawV9Sql(), async () => ({
    authFlow: "public-share",
    shareTokenHash: tokenHash.toLowerCase(),
  }));
}

/** Normalize Neon HTTP query output to a row array without trusting its shape. */
export function rowsFromResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }

  return [];
}
