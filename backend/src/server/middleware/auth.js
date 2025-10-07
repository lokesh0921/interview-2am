import { createRemoteJWKSet, jwtVerify } from "jose";
import { loadConfig } from "../util/config.js";

const config = loadConfig();
let jwks = null;

function getJwks() {
  if (!jwks && config.SUPABASE_JWKS_URL) {
    jwks = createRemoteJWKSet(new URL(config.SUPABASE_JWKS_URL));
  }
  return jwks;
}

async function verifyWithJwks(token) {
  const set = getJwks();
  if (!set) return null;
  try {
    const { payload } = await jwtVerify(token, set, { algorithms: ["RS256"] });
    return payload;
  } catch {
    return null;
  }
}

async function verifyWithSupabaseAPI(token) {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`${config.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const user = await resp.json();
    return { ...user, sub: user.id };
  } catch {
    return null;
  }
}

function withAdminRole(user) {
  if (!user) return null;
  const email = user.email || user.user_metadata?.email || user?.user?.email;
  const isAdmin =
    !!email && email.toLowerCase() === config.ADMIN_EMAIL.toLowerCase();
  if (isAdmin) {
    user.app_metadata = { ...(user.app_metadata || {}), role: "admin" };
  }
  return user;
}

async function parseAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  // Development bypass for testing
  if (config.NODE_ENV === "development" && token === "dev-test-token") {
    console.log("Development bypass: Using test user");
    return {
      sub: "dev-test-user",
      email: "test@example.com",
      app_metadata: { role: "admin" },
    };
  }

  if (!token) {
    console.log("No token found in request");
    return null;
  }

  console.log("Token found, attempting verification...");
  // Prefer Supabase API (fast, HS256-compatible) with timeout first
  const viaAPI = await verifyWithSupabaseAPI(token);
  if (viaAPI) {
    console.log("Token verified via Supabase API");
    return withAdminRole(viaAPI);
  }

  console.log("Supabase API verification failed or timed out, trying JWKS...");
  const viaJwks = await verifyWithJwks(token);
  if (viaJwks) {
    console.log("Token verified via JWKS");
    return withAdminRole(viaJwks);
  }

  console.log("All verification methods failed");
  return null;
}

export const authMiddleware = {
  optional: async (req, _res, next) => {
    req.user = await parseAuth(req);
    next();
  },
  required: async (req, res, next) => {
    if (req.user) return next();
    const user = await parseAuth(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  },
  adminOnly: async (req, res, next) => {
    if (!req.user) req.user = await parseAuth(req);
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const role =
      user.app_metadata?.role || user.role || user.user_metadata?.role;
    if (role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  },
};
