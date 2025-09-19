export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("sb:token") || "";
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(opts.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
