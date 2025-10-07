export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:4001/api";

function getAccessTokenFromLocalStorage(): string {
  // Existing fallback key used elsewhere in the app
  const directToken = localStorage.getItem("sb:token");
  if (directToken) return directToken;

  // Supabase stores session in a key like: sb-<project-ref>-auth-token
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (/^sb-.*-auth-token$/.test(key)) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const accessToken =
          parsed?.access_token || parsed?.currentSession?.access_token;
        if (typeof accessToken === "string" && accessToken) {
          return accessToken;
        }
        const nested = parsed?.currentSession || parsed?.user || parsed?.token;
        if (nested?.access_token) {
          return nested.access_token;
        }
      }
    }
  } catch (_) {
    // Ignore JSON parse errors and continue
  }

  // Last resort: scan all localStorage values to find something that looks like a JWT
  try {
    const jwtRegex = /^[\w-]+\.[\w-]+\.[\w-]+$/; // crude JWT shape
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      const val = localStorage.getItem(key) || "";
      if (!val) continue;
      // If it's JSON, try to parse and look for access_token anywhere
      if (val.startsWith("{") || val.startsWith("[")) {
        try {
          const parsed = JSON.parse(val);
          const stack = [parsed];
          while (stack.length) {
            const cur = stack.pop();
            if (!cur) continue;
            if (typeof cur === "string" && jwtRegex.test(cur)) return cur;
            if (cur && typeof cur === "object") {
              for (const k of Object.keys(cur)) {
                const v = (cur as any)[k];
                if (k === "access_token" && typeof v === "string" && v) {
                  return v;
                }
                if (v && (typeof v === "object" || typeof v === "string")) {
                  stack.push(v);
                }
              }
            }
          }
        } catch (_) {
          // ignore
        }
      } else if (jwtRegex.test(val)) {
        return val;
      }
    }
  } catch (_) {
    // ignore
  }

  return "";
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  // Try to get token from localStorage (handles both dev and production Supabase keys)
  const token = getAccessTokenFromLocalStorage();
  const headers = new Headers(opts.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API Error ${res.status}:`, errorText);
    throw new Error(errorText);
  }

  return res.json();
}
