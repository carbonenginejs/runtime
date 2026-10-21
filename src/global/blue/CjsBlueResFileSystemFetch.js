// Ours, modelled on blue/src/BlueResFileSystemRemote.{h,cpp} and the
// BlueRemoteStream download it drives.
//
// The browser's default res file system: `res:` paths through a URL table, and
// `http(s):` URLs as they are, read with `fetch`. Carbon has no such file
// system because Carbon reads `res:` from disk or from its remote file cache;
// a browser page has neither, and `fetch` is the only way it reads a file.
//
// The path goes in, never a URL: this file system builds the URL from its own
// table, the same table the resource manager kept (`SetPath`, `SetPaths`,
// `SetPathResolver`, `BuildUrl`), so a page configures one place. Everything
// about the network lives here, and the resource manager never calls `fetch`:
//
// - retries, for network failures and server errors (5xx, 408, 429);
// - a timeout for the whole read and a stall limit for a body that stops
//   arriving, both as aborts;
// - the caller's `AbortSignal`, which ends the read and is never retried;
// - absent files (404, 410) as `null`, so the paths service asks the next file
//   system, and every other failure as a rejection that says what failed.
//
// Like Carbon's remote file system, a `.red` path is read as its `.black`
// twin: the client ships red files compiled.
import { CjsSchema, meta, blue } from "#schema";
import { normalizePath, normalizeResourcePath } from "#utils/path";
import { BlueFileUtil } from "./BlueFileUtil.js";
import { BlueResFileSystemForm, IBlueResFileSystem } from "./IBlueResFileSystem.js";

/** HTTP statuses that mean the file is not there: the paths service asks the next file system. */
const ABSENT_STATUSES = new Set([ 404, 410 ]);

/** HTTP statuses worth retrying: the request may succeed if made again. */
const RETRY_STATUSES = new Set([ 408, 429, 500, 502, 503, 504 ]);

/** `CjsBlueResFileSystemFetch` - `res:` and `http(s):` paths read with `fetch`.
 *
 * Modelled on: BlueResFileSystemRemote (blue/src/BlueResFileSystemRemote.h:9)
 */
export class CjsBlueResFileSystemFetch extends IBlueResFileSystem
{
  /** The protocols served: `res:` through the URL table, `http(s):` as they are. */
  static protocols = [ "res", "http", "https" ];

  /** Every form a `Response` can give: bytes, text, its body stream, or parsed JSON as a value. */
  static forms = [
    BlueResFileSystemForm.BYTES,
    BlueResFileSystemForm.TEXT,
    BlueResFileSystemForm.STREAM,
    BlueResFileSystemForm.VALUE
  ];

  /** URL base per protocol, ending in `/`. @type {Map<string, string>} */
  paths = new Map();

  /** Replaces the URL table when set: called as `(normalizedPath, fileSystem)`. @type {Function|null} */
  pathResolver = null;

  /** Further attempts after a retryable failure. */
  retries = 2;

  /** Wait before the first retry, doubled for each one after it. */
  retryDelayMilliseconds = 250;

  /** Abort one attempt after this long; 0 for no limit. */
  timeoutMilliseconds = 60000;

  /** Abort one attempt when its body brings no bytes for this long; 0 for no limit. */
  stallMilliseconds = 15000;

  /** @type {Function} */
  _fetch = null;

  /**
   * @param {object} [options={}] Settings.
   * @param {Function} [options.fetch=globalThis.fetch] A WHATWG fetch.
   * @param {object|Map<string,string>} [options.paths] Initial URL table (`SetPaths`).
   * @param {Function|null} [options.pathResolver=null] Complete path-to-URL resolver (`SetPathResolver`).
   * @param {number} [options.retries] Further attempts after a retryable failure.
   * @param {number} [options.retryDelayMilliseconds] Wait before the first retry.
   * @param {number} [options.timeoutMilliseconds] Limit per attempt; 0 for none.
   * @param {number} [options.stallMilliseconds] Limit between body chunks; 0 for none.
   */
  constructor(options = {})
  {
    super();
    // The browser's fetch must be called on the global; called as this._fetch(...) it throws "Illegal invocation".
    this._fetch = options.fetch ?? (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
    if (typeof this._fetch !== "function") throw new TypeError("CjsBlueResFileSystemFetch needs a fetch.");

    if (options.paths) this.SetPaths(options.paths);
    if (options.pathResolver) this.SetPathResolver(options.pathResolver);
    for (const key of [ "retries", "retryDelayMilliseconds", "timeoutMilliseconds", "stallMilliseconds" ])
    {
      if (options[key] === undefined) continue;
      if (!(options[key] >= 0)) throw new RangeError(`CjsBlueResFileSystemFetch ${key} must be a non-negative number.`);
      this[key] = options[key];
    }
  }

  /**
   * Adds or replaces the URL base for one protocol: `SetPath("res",
   * "https://host/eve/123/res/")` reads `res:/a/b.dds` from
   * `https://host/eve/123/res/a/b.dds`.
   *
   * @param {string} prefix A protocol this class serves, other than `http(s)`.
   * @param {string} urlBase URL base for the protocol's root.
   * @returns {CjsBlueResFileSystemFetch} This file system.
   * @throws {TypeError} For a protocol this class does not serve, or an empty base.
   */
  SetPath(prefix, urlBase)
  {
    const key = normalizePathPrefix(prefix);
    if (!CjsBlueResFileSystemFetch.protocols.includes(key) || key === "http" || key === "https")
    {
      throw new TypeError(`CjsBlueResFileSystemFetch does not map the protocol "${key}".`);
    }

    const url = normalizePath(urlBase);
    if (!url || url.includes("\0")) throw new TypeError("CjsBlueResFileSystemFetch URL bases must be non-empty strings.");
    this.paths.set(key, url.endsWith("/") ? url : `${url}/`);
    return this;
  }

  /**
   * Adds or replaces URL bases from an object or Map of protocol to base.
   *
   * @param {object|Map<string,string>} paths Protocol to URL base.
   * @returns {CjsBlueResFileSystemFetch} This file system.
   */
  SetPaths(paths)
  {
    if (!paths || typeof paths !== "object" || Array.isArray(paths))
    {
      throw new TypeError("CjsBlueResFileSystemFetch paths must be an object or Map.");
    }
    const entries = paths instanceof Map ? paths.entries() : Object.entries(paths);
    for (const [ prefix, urlBase ] of entries) this.SetPath(prefix, urlBase);
    return this;
  }

  /** Whether a protocol has a URL base. */
  HasPath(prefix)
  {
    return this.paths.has(normalizePathPrefix(prefix));
  }

  /** A protocol's URL base, or `null`. */
  GetPath(prefix)
  {
    return this.paths.get(normalizePathPrefix(prefix)) ?? null;
  }

  /**
   * Replaces the URL table with a function, or restores it with `null`.
   *
   * @param {Function|null} resolver Called as `(normalizedPath, fileSystem)`; returns the URL.
   * @returns {CjsBlueResFileSystemFetch} This file system.
   */
  SetPathResolver(resolver)
  {
    if (resolver !== null && typeof resolver !== "function")
    {
      throw new TypeError("CjsBlueResFileSystemFetch pathResolver must be a function or null.");
    }
    this.pathResolver = resolver;
    return this;
  }

  /**
   * The URL a path is read from: the resolver's answer when one is set, an
   * `http(s):` path as it is, otherwise the protocol's URL base joined with
   * the rest of the path. A `.red` path is read as its `.black` twin.
   *
   * @param {string} path Resource path.
   * @returns {string} The URL.
   * @throws {Error} `CJS_RESMAN_PATH_PREFIX_UNREGISTERED` when the protocol has no URL base.
   */
  BuildUrl(path)
  {
    const normalized = normalizeResourcePath(BlueFileUtil.substituteBlackForRedInFilename(String(path)));
    if (!normalized) throw new TypeError("CjsBlueResFileSystemFetch resource path must be a non-empty string.");

    if (this.pathResolver)
    {
      const url = normalizePath(this.pathResolver(normalized, this));
      if (!url || url.includes("\0")) throw new TypeError("CjsBlueResFileSystemFetch pathResolver must return a non-empty URL string.");
      return url;
    }

    const protocol = BlueFileUtil.getResProtocol(normalized);
    if (protocol === "http" || protocol === "https") return normalizePath(path);

    const urlBase = protocol === null ? undefined : this.paths.get(protocol);
    if (!urlBase)
    {
      const error = new Error(`CjsBlueResFileSystemFetch has no URL base for the protocol: ${protocol}`);
      error.code = "CJS_RESMAN_PATH_PREFIX_UNREGISTERED";
      error.path = normalized;
      error.prefix = protocol;
      throw error;
    }
    return `${urlBase}${normalized.slice(normalized.indexOf(":/") + 2)}`;
  }

  /**
   * `FileExists` - always false.
   *
   * Adapted: Carbon's answer is synchronous, and a URL can only be asked
   * asynchronously. Existence questions belong to a file system with an index,
   * such as `BlueResFileSystemRemote`.
   */
  FileExists(_filename)
  {
    return false;
  }

  /** `IsDirectory` - always false; adapted as `FileExists`. */
  IsDirectory(_dir)
  {
    return false;
  }

  /** `GetDirectoryContents` - adds nothing; a URL cannot be listed. Adapted as `FileExists`. */
  GetDirectoryContents(_dir, _results) {}

  /**
   * `ResolvePathW` - the URL the file is read from, or `null` when the path
   * has no URL.
   *
   * Adapted: a URL, where Carbon gives a disk path.
   */
  ResolvePathW(path)
  {
    try
    {
      return this.BuildUrl(path);
    }
    catch
    {
      return null;
    }
  }

  /**
   * `GetStreamFromPathW` - the file in the requested form, or `null` when the
   * server says it is not there (404, 410).
   *
   * Adapted: see the top of this file and of IBlueResFileSystem.js.
   *
   * @param {string} path Resource path.
   * @param {import("./IBlueResFileSystem.js").BlueResFileSystemRequest} request Form and signal.
   * @returns {Promise<import("./IBlueResFileSystem.js").BlueResFileSystemResult|null>} The file, or `null`.
   * @throws {Error} `CJS_RESOURCE_FETCH_FAILED` for any other failure, or the caller's abort reason.
   */
  async GetStreamFromPath(path, request)
  {
    const url = this.BuildUrl(path);
    const signal = request.signal ?? null;

    for (let attempt = 0; ; attempt++)
    {
      signal?.throwIfAborted();

      let failure;
      try
      {
        return await this._Attempt(path, url, request.form, signal);
      }
      catch (error)
      {
        // The caller's abort ends the read at once; anything else may be retried.
        if (signal?.aborted) throw signal.reason;
        failure = error;
      }

      if (!failure.retryable || attempt >= this.retries) throw failure;
      await wait(this.retryDelayMilliseconds * 2 ** attempt, signal);
    }
  }

  /**
   * One fetch of the file, under the timeout and stall limits.
   *
   * @returns {Promise<import("./IBlueResFileSystem.js").BlueResFileSystemResult|null>} The file, or `null` when absent.
   * @throws {Error} `CJS_RESOURCE_FETCH_FAILED`, with `retryable` set when another attempt may succeed.
   */
  async _Attempt(path, url, form, signal)
  {
    const controller = new AbortController();
    const abort = reason => controller.abort(reason);
    const onCallerAbort = () => abort(signal.reason);
    signal?.addEventListener("abort", onCallerAbort, { once: true });

    const timer = this.timeoutMilliseconds > 0
      ? setTimeout(() => abort(fetchError(path, url, `timed out after ${this.timeoutMilliseconds} ms`, { retryable: true })), this.timeoutMilliseconds)
      : null;

    try
    {
      // Request.
      let response;
      try
      {
        response = await this._fetch(url, { signal: controller.signal });
      }
      catch (error)
      {
        throw controller.signal.aborted && controller.signal.reason?.code === "CJS_RESOURCE_FETCH_FAILED"
          ? controller.signal.reason
          : fetchError(path, url, error?.message ?? String(error), { retryable: true, cause: error });
      }

      // Status.
      if (ABSENT_STATUSES.has(response.status)) return null;
      if (!response.ok)
      {
        throw fetchError(path, url, `${response.status} ${response.statusText}`, {
          retryable: RETRY_STATUSES.has(response.status),
          status: response.status,
          statusText: response.statusText
        });
      }

      // Body, in the requested form. A stream goes to the caller unread, so
      // the limits stop at the headers.
      if (form === BlueResFileSystemForm.STREAM)
      {
        clearTimeout(timer);
        return { form, data: response.body };
      }

      const bytes = await this._ReadBody(path, url, response, controller);
      switch (form)
      {
        case BlueResFileSystemForm.BYTES:
          return { form, data: bytes };
        case BlueResFileSystemForm.TEXT:
          return { form, data: new TextDecoder().decode(bytes) };
        case BlueResFileSystemForm.VALUE:
          return { form, data: JSON.parse(new TextDecoder().decode(bytes)) };
        default:
          throw new TypeError(`CjsBlueResFileSystemFetch cannot produce the form "${form}".`);
      }
    }
    finally
    {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onCallerAbort);
    }
  }

  /**
   * The response body as bytes, aborting when no chunk arrives within the
   * stall limit.
   *
   * @returns {Promise<Uint8Array>} The body.
   */
  async _ReadBody(path, url, response, controller)
  {
    if (!response.body) return new Uint8Array(await response.arrayBuffer()); // alloc: view over the response body; does not copy

    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    let stall = null;

    // Each read races the abort: a fetch ties its body to the signal, but a
    // body from elsewhere may not, and a read must not outlive the attempt.
    const aborted = new Promise((_resolve, reject) =>
    {
      const onAbort = () =>
      {
        reject(controller.signal.reason);
        reader.cancel(controller.signal.reason).catch(() => {});
      };
      if (controller.signal.aborted) onAbort();
      else controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    aborted.catch(() => {});
    const arm = () =>
    {
      if (this.stallMilliseconds <= 0) return;
      clearTimeout(stall);
      stall = setTimeout(() => controller.abort(
        fetchError(path, url, `stalled: no data for ${this.stallMilliseconds} ms`, { retryable: true })
      ), this.stallMilliseconds);
    };

    try
    {
      arm();
      for (;;)
      {
        let chunk;
        try
        {
          chunk = await Promise.race([ reader.read(), aborted ]);
        }
        catch (error)
        {
          throw controller.signal.aborted && controller.signal.reason?.code === "CJS_RESOURCE_FETCH_FAILED"
            ? controller.signal.reason
            : fetchError(path, url, error?.message ?? String(error), { retryable: true, cause: error });
        }
        if (chunk.done) break;
        chunks.push(chunk.value);
        length += chunk.value.byteLength;
        arm();
      }
    }
    finally
    {
      clearTimeout(stall);
    }

    if (chunks.length === 1) return chunks[0];
    const bytes = new Uint8Array(length); // alloc: the whole file, joined from its chunks; returned to the caller
    let offset = 0;
    for (const chunk of chunks)
    {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }
}

/**
 * A protocol key: lower-case, without a trailing `:` or `:/`.
 *
 * @param {*} value Candidate protocol.
 * @returns {string}
 */
function normalizePathPrefix(value)
{
  const prefix = String(value ?? "").trim().replace(/:\/?$/u, "").toLowerCase();
  if (!/^[a-z][a-z0-9+.-]*$/u.test(prefix)) throw new TypeError("CjsBlueResFileSystemFetch path prefixes must be URI scheme names.");
  return prefix;
}

/**
 * The read failure: `CJS_RESOURCE_FETCH_FAILED`, as the resource manager's
 * worker reported it, with the path and URL.
 */
function fetchError(path, url, detail, { retryable = false, status, statusText, cause } = {})
{
  const error = new Error(`Resource fetch failed: ${detail} (${url})`, cause === undefined ? undefined : { cause });
  error.code = "CJS_RESOURCE_FETCH_FAILED";
  error.path = path;
  error.url = url;
  error.retryable = retryable;
  if (status !== undefined) error.status = status;
  if (statusText !== undefined) error.statusText = statusText;
  return error;
}

/** Waits, ending early with the signal's reason when it aborts. */
function wait(milliseconds, signal)
{
  return new Promise((resolve, reject) =>
  {
    const timer = setTimeout(() =>
    {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () =>
    {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

CjsSchema.meta.define(CjsBlueResFileSystemFetch, {
  className: "CjsBlueResFileSystemFetch",
  fields: {},
  methods: {
    SetPath: [],
    SetPaths: [],
    HasPath: [],
    GetPath: [],
    SetPathResolver: [],
    BuildUrl: [],
    FileExists: [ blue.method, meta.adapted ],
    IsDirectory: [ blue.method, meta.adapted ],
    GetDirectoryContents: [ blue.method, meta.adapted ],
    ResolvePathW: [ blue.method, meta.adapted ],
    GetStreamFromPath: [ blue.method, meta.renamed("GetStreamFromPathW"), meta.adapted ]
  }
});
