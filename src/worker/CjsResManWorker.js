import { Message, Operation } from "./protocol.js";

/**
 * Static browser-worker host that owns its operation/message vocabulary,
 * executes clone-safe source and format operations, installs the message
 * envelope, transfers owned buffers, and serializes failures for `CjsResMan`.
 */
export class CjsResManWorker
{
  /** Stable operations understood by the bundled resource module worker. */
  static Operation = Operation;

  /** Stable message kinds exchanged with the resource module worker. */
  static Message = Message;

  /**
   * Execute one bundled resource worker operation.
   *
   * This method also permits deterministic non-browser tests and custom
   * worker hosts without installing global message handlers.
   *
   * @param {string} operation Worker operation name.
   * @param {*} payload Structured-cloneable operation payload.
   * @param {object} [context={}] Optional fetch and abort context.
   * @returns {Promise<*>} Operation result.
   */
  static async Execute(operation, payload, context = {})
  {
    switch (operation)
    {
      case Operation.FETCH:
        return FetchResource(payload, context);

      case Operation.FORMAT_READ:
        return ReadFormat(payload);

      default:
      {
        const error = new Error(`Unknown resource worker operation: ${operation}`);
        error.code = "CJS_RESOURCE_WORKER_OPERATION_UNKNOWN";
        error.operation = operation;
        throw error;
      }
    }
  }

  /**
   * Install the ResMan message protocol on a Worker-compatible scope.
   *
   * @param {WorkerGlobalScope|object} scope Worker global.
   * @returns {() => void} Uninstall callback.
   */
  static Install(scope = globalThis)
  {
    if (!scope || typeof scope.postMessage !== "function")
    {
      throw new TypeError("Resource worker scope must provide postMessage.");
    }
    const controllers = new Map();
    const onMessage = async event =>
    {
      const message = event?.data;
      if (!message || typeof message !== "object") return;

      if (message.type === Message.CANCEL)
      {
        controllers.get(message.id)?.abort();
        return;
      }
      if (message.type !== Message.EXECUTE) return;

      const controller = typeof AbortController === "function"
        ? new AbortController()
        : null;
      if (controller) controllers.set(message.id, controller);
      try
      {
        const result = await CjsResManWorker.Execute(
          message.operation,
          message.payload,
          { signal: controller?.signal }
        );
        scope.postMessage({
          type: Message.RESULT,
          id: message.id,
          ok: true,
          result
        }, CjsResManWorker.CollectTransferables(result));
      }
      catch (error)
      {
        scope.postMessage({
          type: Message.RESULT,
          id: message.id,
          ok: false,
          error: CjsResManWorker.SerializeError(error, message.operation)
        });
      }
      finally
      {
        controllers.delete(message.id);
      }
    };

    if (typeof scope.addEventListener === "function")
    {
      scope.addEventListener("message", onMessage);
      return () => scope.removeEventListener?.("message", onMessage);
    }
    const previous = scope.onmessage;
    scope.onmessage = onMessage;
    return () =>
    {
      if (scope.onmessage === onMessage) scope.onmessage = previous || null;
    };
  }

  /**
   * Collect unique transferable ArrayBuffers from a worker result.
   *
   * SharedArrayBuffer is intentionally excluded because it is shared rather
   * than transferable.
   *
   * @param {*} value Result graph.
   * @returns {ArrayBuffer[]} Transfer list.
   */
  static CollectTransferables(value)
  {
    const buffers = new Set();
    const seen = new Set();

    const visit = entry =>
    {
      if (entry === null || entry === undefined) return;
      if (entry instanceof ArrayBuffer)
      {
        buffers.add(entry);
        return;
      }
      if (ArrayBuffer.isView(entry))
      {
        if (entry.buffer instanceof ArrayBuffer) buffers.add(entry.buffer);
        return;
      }
      if (typeof entry !== "object" || seen.has(entry)) return;
      seen.add(entry);
      if (Array.isArray(entry))
      {
        for (const item of entry) visit(item);
        return;
      }
      for (const item of Object.values(entry)) visit(item);
    };

    visit(value);
    return [ ...buffers ];
  }

  /**
   * Convert an exception into a cloneable diagnostic.
   *
   * @param {*} value Failure value.
   * @param {string} [operation] Operation name.
   * @returns {object} Cloneable error data.
   */
  static SerializeError(value, operation = undefined)
  {
    return {
      name: value?.name || "CjsResManWorkerError",
      message: value?.message || String(value),
      code: value?.code,
      operation: value?.operation || operation,
      path: value?.path,
      status: value?.status,
      statusText: value?.statusText
    };
  }
}

async function FetchResource(payload, context) {
  if (!payload || typeof payload.url !== "string") {
    throw new TypeError("Worker fetch requires a URL.");
  }
  const fetchImplementation = context.fetch || globalThis.fetch;
  if (typeof fetchImplementation !== "function") {
    throw new ReferenceError("Worker fetch is unavailable.");
  }
  const options = {
    ...(payload.options || {}),
    ...(context.signal ? { signal: context.signal } : {})
  };
  const response = await fetchImplementation(payload.url, options);
  if (!response.ok) {
    const error = new Error(
      `Resource fetch failed: ${response.status} ${response.statusText}`
    );
    error.code = "CJS_RESOURCE_FETCH_FAILED";
    error.path = payload.path;
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }

  switch (payload.responseType || "arraybuffer") {
    case "arraybuffer":
      return response.arrayBuffer();
    case "blob":
      return response.blob();
    case "json":
      return response.json();
    case "text":
      return response.text();
    default: {
      const error = new Error(`Unsupported worker fetch response type: ${payload.responseType}`);
      error.code = "CJS_RESOURCE_WORKER_RESPONSE_TYPE";
      throw error;
    }
  }
}

async function ReadFormat(payload) {
  if (!payload || typeof payload.module !== "string" || payload.module === "") {
    throw new TypeError("Worker format read requires a module URL.");
  }
  const module = await import(payload.module);
  const Format = module[payload.exportName || "default"];
  if (typeof Format !== "function") {
    throw new TypeError(
      `Worker format export was not found: ${payload.exportName || "default"}`
    );
  }
  const options = payload.options || {};
  if (typeof Format.readAsync === "function") {
    return Format.readAsync(payload.input, options);
  }
  if (typeof Format.read === "function") {
    return Format.read(payload.input, options);
  }

  const reader = new Format(options);
  if (typeof reader.ReadAsync === "function") {
    return reader.ReadAsync(payload.input, options);
  }
  if (typeof reader.Read === "function") {
    return reader.Read(payload.input, options);
  }
  throw new TypeError(`${Format.name} does not expose a read operation.`);
}

const IsWorkerScope = typeof WorkerGlobalScope !== "undefined"
  && globalThis instanceof WorkerGlobalScope;
if (IsWorkerScope) CjsResManWorker.Install(globalThis);
