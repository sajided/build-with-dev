/**
 * Best-effort message from a failed fetch Response (JSON { error }, plain text, or status line).
 */
export async function readFetchErrorDetail(res: Response): Promise<string> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error.length > 0) {
        return parsed.error;
      }
    } catch {
      /* not JSON */
    }
    return trimmed.length > 800 ? `${trimmed.slice(0, 800)}…` : trimmed;
  }
  return `${res.status} ${res.statusText || "Request failed"}`;
}
