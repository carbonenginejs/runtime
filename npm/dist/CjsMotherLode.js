import { normalizeResourcePath } from './resourcePath.js';

class CjsMotherLode {
  #resources = new Map();
  Lookup(path, variant = "") {
    return this.#resources.get(GetCacheKey(path, variant)) || null;
  }
  Insert(resource, path = resource?.GetPath?.() ?? resource?.path, variant = "") {
    const key = GetCacheKey(path, variant);
    this.#resources.set(key, resource);
    return resource;
  }
  Delete(path, variant = "") {
    return this.#resources.delete(GetCacheKey(path, variant));
  }
  DeleteAll(path) {
    const normalizedPath = normalizeResourcePath(path);
    if (!normalizedPath) throw new TypeError("CjsMotherLode requires a resource path.");
    const prefix = `${normalizedPath}\u0000`;
    let deleted = false;
    for (const key of this.#resources.keys()) {
      if (key === normalizedPath || key.startsWith(prefix)) {
        deleted = this.#resources.delete(key) || deleted;
      }
    }
    return deleted;
  }
  Clear() {
    this.#resources.clear();
    return this;
  }
  Has(path, variant = "") {
    return this.#resources.has(GetCacheKey(path, variant));
  }
  GetCount() {
    return this.#resources.size;
  }
  GetStats() {
    return Object.freeze({
      count: this.#resources.size,
      paths: Object.freeze([...new Set([...this.#resources.values()].map(resource => resource?.GetPath?.() ?? resource?.path ?? ""))].filter(Boolean))
    });
  }
  Entries() {
    return this.#resources.entries();
  }
}
function GetCacheKey(path, variant = "") {
  const normalizedPath = normalizeResourcePath(path);
  if (!normalizedPath) throw new TypeError("CjsMotherLode requires a resource path.");
  const normalizedVariant = variant === null || variant === undefined ? "" : String(variant);
  return normalizedVariant ? `${normalizedPath}\u0000${normalizedVariant}` : normalizedPath;
}

export { CjsMotherLode };
//# sourceMappingURL=CjsMotherLode.js.map
