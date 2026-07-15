import { normalizeResourcePath } from './resourcePath.js';

class CjsMemoryResourceSource {
  #records = new Map();
  constructor(records = null) {
    if (records) this.SetRecords(records);
  }
  Set(path, value) {
    this.#records.set(normalizeResourcePath(path), value);
    return this;
  }
  SetRecords(records) {
    for (const [path, value] of Object.entries(records)) {
      this.Set(path, value);
    }
    return this;
  }
  Has(path) {
    return this.#records.has(normalizeResourcePath(path));
  }
  async Read(path) {
    const key = normalizeResourcePath(path);
    if (!this.#records.has(key)) {
      const error = new Error(`Resource not found: ${key}`);
      error.code = "CJS_RESOURCE_NOT_FOUND";
      error.path = key;
      throw error;
    }
    return this.#records.get(key);
  }
}
class CjsFetchResourceSource {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "";
    this.fetch = options.fetch || globalThis.fetch;
  }
  async Read(path, options = {}) {
    if (typeof this.fetch !== "function") {
      throw new TypeError("CjsFetchResourceSource requires a fetch implementation.");
    }
    const response = await this.fetch(this.ResolveUrl(path), options);
    if (!response.ok) {
      const error = new Error(`Resource fetch failed: ${response.status} ${response.statusText}`);
      error.code = "CJS_RESOURCE_FETCH_FAILED";
      error.path = normalizeResourcePath(path);
      error.status = response.status;
      throw error;
    }
    return response.arrayBuffer();
  }
  ResolveUrl(path) {
    const normalized = normalizeResourcePath(path);
    if (!this.baseUrl) return normalized;
    return new URL(normalized, this.baseUrl).toString();
  }
}

export { CjsFetchResourceSource, CjsMemoryResourceSource };
//# sourceMappingURL=CjsResourceSource.js.map
