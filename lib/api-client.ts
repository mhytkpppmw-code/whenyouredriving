export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(res.ok ? "Empty response" : `Request failed (${res.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.slice(0, 80).replace(/\s+/g, " ").trim();
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : preview || `Request failed (${res.status})`
    );
  }
}
