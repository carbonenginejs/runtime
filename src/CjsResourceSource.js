import { normalizeResourcePath } from "./resourcePath.js";
import { CjsResourceWorkerOperation } from "./CjsResourceWorkerProtocol.js";

const FETCH_OPTION_KEYS = Object.freeze([
  "body",
  "cache",
  "credentials",
  "duplex",
  "headers",
  "integrity",
  "keepalive",
  "method",
  "mode",
  "priority",
  "redirect",
  "referrer",
  "referrerPolicy",
  "window"
]);

/**
 * In-memory resource source that maps normalized resource paths to preset
 * values and serves them to reads without any I/O.
 */
export class CjsMemoryResourceSource
{
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

/**
 * Resource source that resolves a normalized path against an optional base
 * URL and reads response bytes through an injected fetch implementation.
 */
export class CjsFetchResourceSource
{
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "";
    this.fetch = options.fetch || globalThis.fetch;
    this.fetchOptions = options.fetchOptions || null;
    this.workerEnabled = options.worker !== false
      && (options.fetch === undefined || options.worker === true);
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

  /**
   * Describe the equivalent cloneable worker fetch operation.
   *
   * An injected fetch implementation stays on the caller thread unless the
   * source explicitly opts into worker fetch with `{ worker: true }`.
   *
   * @param {string} path Normalized resource path.
   * @param {object} [options={}] Resource and fetch options.
   * @returns {object|null} Worker operation, or `null` when worker fetch is disabled.
   */
  CreateWorkerRequest(path, options = {}) {
    if (!this.workerEnabled) return null;
    return {
      operation: CjsResourceWorkerOperation.FETCH,
      payload: {
        url: this.ResolveUrl(path),
        path: normalizeResourcePath(path),
        responseType: "arraybuffer",
        options: GetCloneableFetchOptions(this.fetchOptions, options.fetchOptions || options)
      },
      signal: options.signal || null
    };
  }
}

function GetCloneableFetchOptions(defaults, options) {
  const result = {};
  for (const source of [ defaults, options ]) {
    if (!source || typeof source !== "object") continue;
    for (const key of FETCH_OPTION_KEYS) {
      if (source[key] === undefined) continue;
      result[key] = key === "headers"
        ? NormalizeFetchHeaders(source[key])
        : source[key];
    }
  }
  return result;
}

function NormalizeFetchHeaders(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(entry => Array.isArray(entry) ? [ ...entry ] : entry);
  }
  if (typeof value.entries === "function") {
    return [ ...value.entries() ];
  }
  return { ...value };
}
