import { Operation } from "./worker/protocol.js";

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
 * `CjsResMan` provider that fetches an already-resolved URL on the caller
 * thread or through the resource worker.
 */
export class CjsResManFetchProvider
{
  /** Creates a CjsResManFetchProvider with caller-provided fetch policy. */
  constructor(options = {})
  {
    this.fetch = options.fetch || globalThis.fetch;
    this.fetchOptions = options.fetchOptions || null;
    this.workerEnabled = options.worker !== false
      && (options.fetch === undefined || options.worker === true);
  }

  /**
   * Fetches bytes for a URL already resolved by CjsResMan.
   *
   * @param {string} url Resolved source URL.
   * @param {object} [options={}] Resource and fetch options.
   * @returns {Promise<ArrayBuffer>} Response bytes.
   */
  async Read(url, options = {})
  {
    if (typeof this.fetch !== "function")
    {
      throw new TypeError("CjsResManFetchProvider requires a fetch implementation.");
    }

    const fetchOptions = getCloneableFetchOptions(
      this.fetchOptions,
      options.fetchOptions || options
    );
    if (options.signal) fetchOptions.signal = options.signal;
    const response = await this.fetch(url, fetchOptions);
    if (!response.ok)
    {
      const error = new Error(`Resource fetch failed: ${response.status} ${response.statusText}`);
      error.code = "CJS_RESOURCE_FETCH_FAILED";
      error.path = options.resourcePath || url;
      error.url = url;
      error.status = response.status;
      throw error;
    }

    return response.arrayBuffer();
  }

  /**
   * Describe the equivalent cloneable worker fetch operation.
   *
   * An injected fetch implementation stays on the caller thread unless the
   * source explicitly opts into worker fetch with `{ worker: true }`.
   *
   * @param {string} url URL already resolved by CjsResMan.
   * @param {object} [options={}] Resource and fetch options.
   * @returns {object|null} Worker operation, or `null` when worker fetch is disabled.
   */
  CreateWorkerRequest(url, options = {})
  {
    if (!this.workerEnabled) return null;
    return {
      operation: Operation.FETCH,
      payload: {
        url,
        path: options.resourcePath || url,
        responseType: "arraybuffer",
        options: getCloneableFetchOptions(this.fetchOptions, options.fetchOptions || options)
      },
      signal: options.signal || null
    };
  }

  /** Signals that CjsResMan must resolve resource paths before provider reads. */
  static requiresUrl = true;
}

function getCloneableFetchOptions(defaults, options) {
  const result = {};
  for (const source of [ defaults, options ]) {
    if (!source || typeof source !== "object") continue;
    for (const key of FETCH_OPTION_KEYS) {
      if (source[key] === undefined) continue;
      result[key] = key === "headers"
        ? normalizeFetchHeaders(source[key])
        : source[key];
    }
  }
  return result;
}

function normalizeFetchHeaders(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(entry => Array.isArray(entry) ? [ ...entry ] : entry);
  }
  if (typeof value.entries === "function") {
    return [ ...value.entries() ];
  }
  return { ...value };
}
