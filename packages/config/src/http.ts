import { getEnv } from "./env";

export class InternalFetchError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "InternalFetchError";
    this.status = status;
    this.body = body;
  }
}

export function internalHeaders(extra: Record<string, string> = {}) {
  return {
    "content-type": "application/json",
    "x-internal-token": getEnv().INTERNAL_SERVICE_TOKEN,
    ...extra,
  };
}

export async function fetchJson<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  // Fastify rejects JSON-labelled mutating requests without a JSON body.
  // Send an empty object for bodyless internal mutations so downstream
  // parsers consistently accept DELETE/POST/PATCH calls.
  let safeInit = init;
  if (init.body == null && init.headers) {
    const headers = new Headers(init.headers);
    if (headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      const method = init.method?.toUpperCase() ?? "GET";
      if (method === "GET" || method === "HEAD") {
        headers.delete("content-type");
      }
      safeInit =
        method === "GET" || method === "HEAD"
          ? { ...init, headers }
          : { ...init, headers, body: "{}" };
    }
  }

  const response = await fetch(input, safeInit);

  if (!response.ok) {
    const errorText = await response.text();
    let parsed: unknown = errorText;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      // keep raw text
    }
    const message =
      (parsed && typeof parsed === "object" && "message" in (parsed as Record<string, unknown>)
        ? String((parsed as { message?: unknown }).message ?? "")
        : "") || `${response.status} ${response.statusText}`;
    throw new InternalFetchError(message, response.status, parsed);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
