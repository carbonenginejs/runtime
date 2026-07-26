import { Operation, Message } from './protocol.js';
import { CjsResManMainThreadLoader } from './CjsResManMainThreadLoader.js';

const DEFAULT_WORKER_OPTIONS = Object.freeze({
  type: "module",
  name: "CjsResManWorker"
});

/**
 * Browser module-worker strategy that correlates source/format requests, transfers owned buffers, propagates cancellation and fatal failure, and delegates unsupported operations to a main-thread loader.
 *
 * One module worker can overlap fetch requests and serializes synchronous
 * reader work on its own event loop. Sources opt in through
 * `CreateWorkerRequest(path, options)`. Formats opt in through a static
 * `worker` declaration containing their module URL and export name.
 */
class CjsResManWorkerLoader {
  #boundError;
  #boundMessage;
  #nextId = 1;
  #pending = new Map();

  /**
   * @param {object} [options={}] Worker construction and fallback options.
   * @param {CjsResManMainThreadLoader|object} [options.fallback] Unsupported-operation fallback.
   * @param {Worker|object} [options.worker] Existing Worker-compatible instance.
   * @param {(url: string|URL, options: object) => Worker|object} [options.workerFactory] Worker factory.
   * @param {string|URL} [options.workerUrl] Module worker entry URL.
   * @param {object} [options.workerOptions] Options passed to the Worker constructor.
   * @param {boolean} [options.enabled=true] Whether worker execution may be used.
   */
  constructor(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResManWorkerLoader options must be an object.");
    }
    this.fallback = options.fallback || new CjsResManMainThreadLoader();
    assertResourceLoader(this.fallback, "fallback");
    this.workerFactory = options.workerFactory || defaultWorkerFactory;
    if (typeof this.workerFactory !== "function") {
      throw new TypeError("CjsResManWorkerLoader workerFactory must be a function.");
    }
    this.workerUrl = options.workerUrl || new URL("./CjsResManWorker.js", import.meta.url);
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
   * @returns {CjsResManWorkerLoader} This loader.
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
      const error = normalizeWorkerError(reason || createWorkerUnavailableError("Resource worker was disabled."));
      for (const request of this.#pending.values()) {
        cleanupPendingRequest(request);
        request.reject(error);
      }
      this.#pending.clear();
    }
    return this;
  }

  /**
   * Clear a previous creation/fatal failure so a later enable can retry.
   *
   * @returns {CjsResManWorkerLoader} This loader.
   */
  Reset() {
    this.failed = false;
    this.enabled = true;
    return this;
  }

  /**
   * Replace the unsupported-operation fallback.
   *
   * @param {CjsResManMainThreadLoader|object} fallback Loader exposing Read and ReadFormat.
   * @returns {CjsResManWorkerLoader} This loader.
   */
  SetFallback(fallback) {
    assertResourceLoader(fallback, "fallback");
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
    assertResourceSource(source);
    if (typeof source.CreateWorkerRequest !== "function") {
      return this.fallback.Read(source, path, options);
    }
    const request = normalizeWorkerRequest(source.CreateWorkerRequest(path, options));
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
    const declaration = normalizeFormatWorkerDeclaration(descriptor);
    return Boolean(declaration && isWorkerFormatOutputSupported(declaration, formatOptions) && canCloneWorkerValue(formatOptions) && this.IsAvailable());
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
    const declaration = normalizeFormatWorkerDeclaration(descriptor);
    if (!declaration || !isWorkerFormatOutputSupported(declaration, formatOptions) || !canCloneWorkerValue(formatOptions) || !this.IsAvailable()) {
      return this.fallback.ReadFormat(descriptor, input, formatOptions);
    }
    const transfer = declaration.transferInput ? getExclusiveInputTransferables(input) : [];
    return this.Execute(Operation.FORMAT_READ, {
      module: declaration.module,
      exportName: declaration.exportName,
      input,
      options: formatOptions
    }, {
      transfer
    });
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
      return Promise.reject(createWorkerUnavailableError());
    }
    const signal = options.signal || null;
    if (signal?.aborted) return Promise.reject(createAbortError(signal.reason));
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
        cleanupPendingRequest(request);
        try {
          this.worker?.postMessage({
            type: Message.CANCEL,
            id
          });
        } catch {
          // The local abort remains authoritative if the worker is already gone.
        }
        reject(createAbortError(signal.reason));
      };
      signal.addEventListener("abort", request.onAbort, {
        once: true
      });
    }
    this.#pending.set(id, request);
    try {
      this.worker.postMessage({
        type: Message.EXECUTE,
        id,
        operation,
        payload
      }, normalizeTransferList(options.transfer));
    } catch (error) {
      this.#pending.delete(id);
      cleanupPendingRequest(request);
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

  /** Attach this loader's result and failure listeners to a worker. */
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

  /** Detach this loader's result and failure listeners from a worker. */
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

  /** Settle the pending request identified by one worker result message. */
  #OnMessage(event) {
    const data = event?.data;
    if (!data || data.type !== Message.RESULT) return;
    const request = this.#pending.get(data.id);
    if (!request) return;
    this.#pending.delete(data.id);
    cleanupPendingRequest(request);
    if (data.ok) request.resolve(data.result);else request.reject(normalizeWorkerError(data.error));
  }

  /** Disable worker execution after a fatal worker or message failure. */
  #OnError(event) {
    const reason = event?.error || event || new Error("Resource worker failed.");
    this.Disable(reason);
  }
}
function assertResourceSource(source) {
  if (!source || typeof source !== "object" && typeof source !== "function" || typeof source.Read !== "function") {
    throw new TypeError("Resource source must provide Read(path, options).");
  }
}
function assertResourceLoader(loader, name = "loader") {
  if (!loader || typeof loader.Read !== "function" || typeof loader.ReadFormat !== "function") {
    throw new TypeError(`CjsResManWorkerLoader ${name} must provide Read and ReadFormat.`);
  }
}
function defaultWorkerFactory(url, options) {
  if (typeof Worker === "undefined") {
    throw new ReferenceError("Browser Worker is not available.");
  }
  return new Worker(url, options);
}
function normalizeWorkerRequest(request) {
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
    transfer: normalizeTransferList(request.transfer)
  };
}
function normalizeFormatWorkerDeclaration(descriptor) {
  const Format = descriptor?.Format;
  const declaration = descriptor?.worker || Format?.worker;
  if (!declaration) return null;
  const value = typeof declaration === "string" ? {
    module: declaration
  } : declaration;
  if (!value || typeof value !== "object" || !value.module) return null;
  return Object.freeze({
    module: String(value.module),
    exportName: String(value.exportName || Format?.name || "default"),
    outputTypes: Array.isArray(value.outputTypes) ? Object.freeze(value.outputTypes.map(String)) : null,
    defaultOutput: value.defaultOutput === undefined ? undefined : String(value.defaultOutput),
    transferInput: value.transferInput === true
  });
}
function isWorkerFormatOutputSupported(declaration, formatOptions) {
  if (!declaration.outputTypes) return true;
  const output = formatOptions.emit ?? declaration.defaultOutput;
  return output !== undefined && declaration.outputTypes.includes(String(output));
}
function normalizeTransferList(value) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new TypeError("Worker transfer list must be an array.");
  }
  return value;
}
function getExclusiveInputTransferables(input) {
  if (input instanceof ArrayBuffer) return [input];
  if (ArrayBuffer.isView(input) && input.byteOffset === 0 && input.byteLength === input.buffer.byteLength) {
    return [input.buffer];
  }
  return [];
}
function canCloneWorkerValue(value, seen = new Set()) {
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
    return value.every(entry => canCloneWorkerValue(entry, seen));
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every(entry => canCloneWorkerValue(entry, seen));
}
function cleanupPendingRequest(request) {
  if (request.signal && request.onAbort && typeof request.signal.removeEventListener === "function") {
    request.signal.removeEventListener("abort", request.onAbort);
  }
}
function createWorkerUnavailableError(message = "Resource worker is unavailable.") {
  const error = new Error(message);
  error.name = "CjsResManWorkerUnavailableError";
  error.code = "CJS_RESOURCE_WORKER_UNAVAILABLE";
  return error;
}
function createAbortError(reason) {
  if (reason instanceof Error) return reason;
  const error = new Error(reason === undefined ? "Resource worker request was aborted." : String(reason));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}
function normalizeWorkerError(value) {
  if (value instanceof Error) return value;
  const error = new Error(value?.message || "Resource worker operation failed.");
  error.name = value?.name || "CjsResManWorkerError";
  for (const key of ["code", "operation", "path", "status", "statusText"]) {
    if (value?.[key] !== undefined) error[key] = value[key];
  }
  return error;
}

export { CjsResManWorkerLoader };
//# sourceMappingURL=CjsResManWorkerLoader.js.map
