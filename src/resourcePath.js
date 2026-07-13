export function normalizeResourcePath(value) {
  return String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

export function getResourceExtension(value) {
  const path = normalizeResourcePath(value);
  const queryIndex = path.search(/[?#]/u);
  const cleanPath = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const slashIndex = cleanPath.lastIndexOf("/");
  const dotIndex = cleanPath.lastIndexOf(".");

  if (dotIndex === -1 || dotIndex < slashIndex) return "";
  return cleanPath.slice(dotIndex + 1);
}

export function normalizeResourceExtension(value) {
  return String(value ?? "").trim().replace(/^\./u, "").toLowerCase();
}
