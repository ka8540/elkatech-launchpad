import { getEnv } from "./env";

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
  // Fastify rejects requests that declare `Content-Type: application/json`
  // but carry no body (FST_ERR_CTP_EMPTY_JSON_BODY). Strip the JSON
  // content-type when we aren't actually sending a body so bodyless
  // internal calls (DELETE, etc.) pass the downstream parser.
  let safeInit = init;
  if (init.body == null && init.headers) {
    const headers = new Headers(init.headers);
    if (headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      headers.delete("content-type");
      safeInit = { ...init, headers };
    }
  }

  const response = await fetch(input, safeInit);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
