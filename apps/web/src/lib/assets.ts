const SPECIAL_PROTOCOL = /^[a-z]+:/i;
const ABSOLUTE_URL = /^(?:https?:)?\/\//i;

export function toPublicAsset(path: string) {
  if (!path || path.startsWith("/") || path.startsWith("#")) {
    return path;
  }

  if (ABSOLUTE_URL.test(path) || SPECIAL_PROTOCOL.test(path) || path.startsWith("data:")) {
    return path;
  }

  return `/${path.replace(/^\/+/, "")}`;
}
