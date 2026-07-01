// All API calls use HttpOnly cookie auth — no token management needed in JS.
// The browser automatically sends the cookie with every request because we
// include credentials: "include" on all fetches.

export async function api<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");

  if (!res.ok) {
    const message =
      typeof data === "string"
        ? data.trim()
        : (data as { error?: string; message?: string }).error ??
          (data as { error?: string; message?: string }).message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return data as T;
}
