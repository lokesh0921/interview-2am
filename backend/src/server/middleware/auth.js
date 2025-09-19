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
    const resp = await fetch(`${config.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.SUPABASE_ANON_KEY,
      },
    });
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
  if (!token) return null;

  const viaJwks = await verifyWithJwks(token);
  if (viaJwks) return withAdminRole(viaJwks);

  const viaAPI = await verifyWithSupabaseAPI(token);
  return withAdminRole(viaAPI);
}

export const authMiddleware = {
  optional: async (req, _res, next) => {
    req.user = await parseAuth(req);
    next();
  },
  required: async (req, res, next) => {
    const user = await parseAuth(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  },
  adminOnly: async (req, res, next) => {
    const user = await parseAuth(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const role =
      user.app_metadata?.role || user.role || user.user_metadata?.role;
    if (role !== "admin") return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  },
};
