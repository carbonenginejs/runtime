import {
  CjsResourceWorkerMessage,
  CjsResourceWorkerOperation
} from "./CjsResourceWorkerProtocol.js";

const DEFAULT_WORKER_OPTIONS = Object.freeze({
  type: "module",
  name: "CjsResourceWorker"
});

/**
 * Direct resource execution strategy used when no browser worker is selected
 * or when a source/format does not declare a worker-safe operation.
 */
export class CjsResourceMainThreadLoader
{
  /**
   * Read through an injected resource source.
   *
   * @param {object|Function} source Source exposing `Read(path, options)`.
   * @param {string} path Normalized resource path.
   * @param {object} [options={}] Source read options.
   * @returns {*} Source result or promise.
   */
  Read(source, path, options = {}) {
    AssertResourceSource(source);
    return source.Read(path, options);
  }

  /**
   * Main-thread loaders never claim worker execution.
   *
   * @returns {false}
   */
  CanReadFormat() {
    return false;
  }

  /**
   * Execute one normalized format read on the current thread.
   *
   * @param {object} descriptor Registered format descriptor.
   * @param {*} input Reader input.
   * @param {object} [formatOptions={}] Normalized format options.
   * @returns {Promise<*>} Format result.
   */
  ReadFormat(descriptor, input, formatOptions = {}) {
    return ReadFormatOnCurrentThread(descriptor, input, formatOptions);
  }

  /**
   * Main-thread execution owns no pending worker requests.
   *
   * @returns {0}
   */
  GetPendingCount() {
    return 0;
  }
}

/**
 * Browser-worker resource execution strategy.
 *
 * One module worker can overlap fetch requests and serializes synchronous
 * reader work on its own event loop. Sources opt in through
 * `CreateWorkerRequest(path, options)`. Formats opt in through a static
 * `worker` declaration containing their module URL and export name.
 */
export class CjsResourceWorkerLoader
{
  #boundError;
  #boundMessage;
  #nextId = 1;
  #pending = new Map();

  /**
   * @param {object} [options={}] Worker construction and fallback options.
   * @param {CjsResourceMainThreadLoader|object} [options.fallback] Unsupported-operation fallback.
   * @param {Worker|object} [options.worker] Existing Worker-compatible instance.
   * @param {(url: string|URL, options: object) => Worker|object} [options.workerFactory] Worker factory.
   * @param {string|URL} [options.workerUrl] Module worker entry URL.
   * @param {object} [options.workerOptions] Options passed to the Worker constructor.
   * @param {boolean} [options.enabled=true] Whether worker execution may be used.
   */
  constructor(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResourceWorkerLoader options must be an object.");
    }

    this.fallback = options.fallback || new CjsResourceMainThreadLoader();
    AssertResourceLoader(this.fallback, "fallback");
    this.workerFactory = options.workerFactory || DefaultWorkerFactory;
    if (typeof this.workerFactory !== "function") {
      throw new TypeError("CjsResourceWorkerLoader workerFactory must be a function.");
    }
    this.workerUrl = options.workerUrl
      || new URL("./CjsResourceWorker.js", import.meta.url);
    this.workerOptions = Object.freeze({
      ...DEFAULT_WORKER_OPTIONS,
      ...(options.workerOptions || {})
    });
    this.enabled = options.enabled !== false;
    this.failed = false;
    this.worker = options.worker || null;
    this.#boundMessage = event => this.#OnMessage(event);
    this.#boundError = event => this.#OnError(event);
    if (this.worker) this.#Attach(this.worker);
  }

  /**
   * Enable and lazily create the configured worker.
   *
   * @param {string|URL} [workerUrl] Optional replacement worker URL.
   * @returns {boolean} Whether a worker is ready.
   */
  Enable(workerUrl = this.workerUrl) {
    this.enabled = true;
    if (workerUrl !== undefined && workerUrl !== null) this.workerUrl = workerUrl;
    if (this.worker) return true;
    if (this.failed) return false;

    try {
      const worker = this.workerFactory(this.workerUrl, this.workerOptions);
      if (!worker || typeof worker.postMessage !== "function") {
        throw new TypeError("Worker factory did not return a Worker-compatible object.");
      }
      this.worker = worker;
      this.#Attach(worker);
      return true;
    } catch {
      this.worker = null;
      this.failed = true;
      return false;
    }
  }

  /**
   * Stop worker use and reject every pending request.
   *
   * @param {*} [reason] Optional failure reason.
   * @returns {CjsResourceWorkerLoader} This loader.
   */
  Disable(reason = null) {
    const worker = this.worker;
    if (worker) {
      this.#Detach(worker);
      worker.terminate?.();
    }
    this.worker = null;
    this.enabled = false;
    this.failed = reason !== null && reason !== undefined;

    if (this.#pending.size) {
      const error = NormalizeWorkerError(
        reason || CreateWorkerUnavailableError("Resource worker was disabled.")
      );
      for (const request of this.#pending.values()) {
        CleanupPendingRequest(request);
        request.reject(error);
      }
      this.#pending.clear();
    }
    return this;
  }

  /**
   * Clear a previous creation/fatal failure so a later enable can retry.
   *
   * @returns {CjsResourceWorkerLoader} This loader.
   */
  Reset() {
    this.failed = false;
    this.enabled = true;
    return this;
  }

  /**
   * Replace the unsupported-operation fallback.
   *
   * @param {CjsResourceMainThreadLoader|object} fallback Loader exposing Read and ReadFormat.
   * @returns {CjsResourceWorkerLoader} This loader.
   */
  SetFallback(fallback) {
    AssertResourceLoader(fallback, "fallback");
    this.fallback = fallback;
    return this;
  }

  /**
   * Report whether worker execution is configured and constructible.
   *
   * @returns {boolean}
   */
  IsAvailable() {
    return this.enabled && (Boolean(this.worker) || this.Enable());
  }

  /**
   * Read a source through its declared worker request, falling back when the
   * source is not worker-aware or a worker cannot be created.
   *
   * @param {object|Function} source Source implementation.
   * @param {string} path Normalized resource path.
   * @param {object} [options={}] Source options.
   * @returns {Promise<*>|*} Source result.
   */
  Read(source, path, options = {}) {
    AssertResourceSource(source);
    if (typeof source.CreateWorkerRequest !== "function") {
      return this.fallback.Read(source, path, options);
    }

    const request = NormalizeWorkerRequest(source.CreateWorkerRequest(path, options));
    if (!request || !this.IsAvailable()) {
      return this.fallback.Read(source, path, options);
    }
    return this.Execute(request.operation, request.payload, {
      signal: request.signal || options.signal,
      transfer: request.transfer
    });
  }

  /**
   * Test whether a registered format can be safely dispatched to this worker.
   *
   * @param {object} descriptor Registered format descriptor.
   * @param {object} [formatOptions={}] Normalized format options.
   * @returns {boolean}
   */
  CanReadFormat(descriptor, formatOptions = {}) {
    const declaration = NormalizeFormatWorkerDeclaration(descriptor);
    return Boolean(
      declaration
      && IsWorkerFormatOutputSupported(declaration, formatOptions)
      && CanCloneWorkerValue(formatOptions)
      && this.IsAvailable()
    );
  }

  /**
   * Execute a worker-safe format reader or use the main-thread fallback.
   *
   * Inputs are cloned by default so shared source-cache ownership is not
   * detached. A format may explicitly declare `transferInput: true` when its
   * caller guarantees exclusive ownership.
   *
   * @param {object} descriptor Registered format descriptor.
   * @param {*} input Reader input.
   * @param {object} [formatOptions={}] Normalized format options.
   * @returns {Promise<*>} Format result.
   */
  ReadFormat(descriptor, input, formatOptions = {}) {
    const declaration = NormalizeFormatWorkerDeclaration(descriptor);
    if (!declaration
      || !IsWorkerFormatOutputSupported(declaration, formatOptions)
      || !CanCloneWorkerValue(formatOptions)
      || !this.IsAvailable()) {
      return this.fallback.ReadFormat(descriptor, input, formatOptions);
    }

    const transfer = declaration.transferInput
      ? GetExclusiveInputTransferables(input)
      : [];
    return this.Execute(CjsResourceWorkerOperation.FORMAT_READ, {
      module: declaration.module,
      exportName: declaration.exportName,
      input,
      options: formatOptions
    }, { transfer });
  }

  /**
   * Dispatch one operation using the stable worker message protocol.
   *
   * @param {string} operation Operation name.
   * @param {*} payload Structured-cloneable operation payload.
   * @param {object} [options={}] Transfer and cancellation options.
   * @returns {Promise<*>} Worker result.
   */
  Execute(operation, payload, options = {}) {
    if (typeof operation !== "string" || operation.trim() === "") {
      return Promise.reject(new TypeError("Worker operation must be a non-empty string."));
    }
    if (!this.IsAvailable()) {
      return Promise.reject(CreateWorkerUnavailableError());
    }
    const signal = options.signal || null;
    if (signal?.aborted) return Promise.reject(CreateAbortError(signal.reason));

    const id = this.#nextId++;
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    const request = {
      id,
      resolve,
      reject,
      signal,
      onAbort: null
    };
    if (signal && typeof signal.addEventListener === "function") {
      request.onAbort = () => {
        if (!this.#pending.delete(id)) return;
        CleanupPendingRequest(request);
        try {
          this.worker?.postMessage({
            type: CjsResourceWorkerMessage.CANCEL,
            id
          });
        } catch {
          // The local abort remains authoritative if the worker is already gone.
        }
        reject(CreateAbortError(signal.reason));
      };
      signal.addEventListener("abort", request.onAbort, { once: true });
    }
    this.#pending.set(id, request);

    try {
      this.worker.postMessage({
        type: CjsResourceWorkerMessage.EXECUTE,
        id,
        operation,
        payload
      }, NormalizeTransferList(options.transfer));
    } catch (error) {
      this.#pending.delete(id);
      CleanupPendingRequest(request);
      reject(error);
    }
    return promise;
  }

  /**
   * Return the number of unresolved worker requests.
   *
   * @returns {number}
   */
  GetPendingCount() {
    return this.#pending.size;
  }

  #Attach(worker) {
    if (typeof worker.addEventListener === "function") {
      worker.addEventListener("message", this.#boundMessage);
      worker.addEventListener("error", this.#boundError);
      worker.addEventListener("messageerror", this.#boundError);
    } else {
      worker.onmessage = this.#boundMessage;
      worker.onerror = this.#boundError;
      worker.onmessageerror = this.#boundError;
    }
  }

  #Detach(worker) {
    if (typeof worker.removeEventListener === "function") {
      worker.removeEventListener("message", this.#boundMessage);
      worker.removeEventListener("error", this.#boundError);
      worker.removeEventListener("messageerror", this.#boundError);
    } else {
      if (worker.onmessage === this.#boundMessage) worker.onmessage = null;
      if (worker.onerror === this.#boundError) worker.onerror = null;
      if (worker.onmessageerror === this.#boundError) worker.onmessageerror = null;
    }
  }

  #OnMessage(event) {
    const data = event?.data;
    if (!data || data.type !== CjsResourceWorkerMessage.RESULT) return;
    const request = this.#pending.get(data.id);
    if (!request) return;
    this.#pending.delete(data.id);
    CleanupPendingRequest(request);
    if (data.ok) request.resolve(data.result);
    else request.reject(NormalizeWorkerError(data.error));
  }

  #OnError(event) {
    const reason = event?.error || event || new Error("Resource worker failed.");
    this.Disable(reason);
  }
}

/**
 * Invoke a format facade without crossing a worker boundary.
 *
 * @param {object} descriptor Registered format descriptor.
 * @param {*} input Reader input.
 * @param {object} formatOptions Normalized format options.
 * @returns {Promise<*>} Reader result.
 */
export function ReadFormatOnCurrentThread(descriptor, input, formatOptions = {}) {
  const Format = descriptor?.Format;
  if (typeof Format !== "function") {
    throw new TypeError("Resource format descriptor requires a Format class.");
  }
  if (typeof Format.readAsync === "function") {
    return Format.readAsync(input, formatOptions);
  }
  if (typeof Format.read === "function") {
    return Format.read(input, formatOptions);
  }

  const reader = new Format(formatOptions);
  if (typeof reader.ReadAsync === "function") {
    return reader.ReadAsync(input, formatOptions);
  }
  if (typeof reader.Read === "function") {
    return reader.Read(input, formatOptions);
  }
  throw new TypeError(`${Format.name} does not expose a read operation.`);
}

function AssertResourceSource(source) {
  if (!source || (typeof source !== "object" && typeof source !== "function")
    || typeof source.Read !== "function") {
    throw new TypeError("Resource source must provide Read(path, options).");
  }
}

function AssertResourceLoader(loader, name = "loader") {
  if (!loader || typeof loader.Read !== "function" || typeof loader.ReadFormat !== "function") {
    throw new TypeError(`CjsResourceWorkerLoader ${name} must provide Read and ReadFormat.`);
  }
}

function DefaultWorkerFactory(url, options) {
  if (typeof Worker === "undefined") {
    throw new ReferenceError("Browser Worker is not available.");
  }
  return new Worker(url, options);
}

function NormalizeWorkerRequest(request) {
  if (request === null || request === undefined || request === false) return null;
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("CreateWorkerRequest must return an object or null.");
  }
  if (typeof request.operation !== "string" || request.operation.trim() === "") {
    throw new TypeError("Worker source request requires a non-empty operation.");
  }
  return {
    operation: request.operation,
    payload: request.payload,
    signal: request.signal || null,
    transfer: NormalizeTransferList(request.transfer)
  };
}

function NormalizeFormatWorkerDeclaration(descriptor) {
  const Format = descriptor?.Format;
  const declaration = descriptor?.worker || Format?.worker;
  if (!declaration) return null;

  const value = typeof declaration === "string"
    ? { module: declaration }
    : declaration;
  if (!value || typeof value !== "object" || !value.module) return null;
  return Object.freeze({
    module: String(value.module),
    exportName: String(value.exportName || Format?.name || "default"),
    outputTypes: Array.isArray(value.outputTypes)
      ? Object.freeze(value.outputTypes.map(String))
      : null,
    defaultOutput: value.defaultOutput === undefined
      ? undefined
      : String(value.defaultOutput),
    transferInput: value.transferInput === true
  });
}

function IsWorkerFormatOutputSupported(declaration, formatOptions) {
  if (!declaration.outputTypes) return true;
  const output = formatOptions.emit ?? declaration.defaultOutput;
  return output !== undefined && declaration.outputTypes.includes(String(output));
}

function NormalizeTransferList(value) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new TypeError("Worker transfer list must be an array.");
  }
  return value;
}

function GetExclusiveInputTransferables(input) {
  if (input instanceof ArrayBuffer) return [ input ];
  if (ArrayBuffer.isView(input)
    && input.byteOffset === 0
    && input.byteLength === input.buffer.byteLength) {
    return [ input.buffer ];
  }
  return [];
}

function CanCloneWorkerValue(value, seen = new Set()) {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean" || type === "bigint") {
    return true;
  }
  if (type !== "object") return false;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof Date) {
    return true;
  }
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.every(entry => CanCloneWorkerValue(entry, seen));
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every(entry => CanCloneWorkerValue(entry, seen));
}

function CleanupPendingRequest(request) {
  if (request.signal && request.onAbort
    && typeof request.signal.removeEventListener === "function") {
    request.signal.removeEventListener("abort", request.onAbort);
  }
}

function CreateWorkerUnavailableError(message = "Resource worker is unavailable.") {
  const error = new Error(message);
  error.name = "CjsResourceWorkerUnavailableError";
  error.code = "CJS_RESOURCE_WORKER_UNAVAILABLE";
  return error;
}

function CreateAbortError(reason) {
  if (reason instanceof Error) return reason;
  const error = new Error(reason === undefined ? "Resource worker request was aborted." : String(reason));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}

function NormalizeWorkerError(value) {
  if (value instanceof Error) return value;
  const error = new Error(value?.message || "Resource worker operation failed.");
  error.name = value?.name || "CjsResourceWorkerError";
  for (const key of [ "code", "operation", "path", "status", "statusText" ]) {
    if (value?.[key] !== undefined) error[key] = value[key];
  }
  return error;
}
