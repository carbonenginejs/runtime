import { CjsSchema } from "#schema/CjsSchema";

// The worker side of a `BlueCallbackMan` running its own threads.
//
// Ours: Carbon's callback threads run functions already in the process
// (CallbackMan.cpp:215-243). A browser worker can only run code its own
// module loaded, so a worker module installs this host with the callbacks it
// exports, by name, and the manager sends entries naming them. Each callback
// gets the entry's context and an AbortSignal that fires when the entry is
// cancelled; a long callback checks it between pieces of work, since a
// cancel message is only delivered when the callback yields.

/**
 * Buffers in a result, moved rather than copied back to the manager.
 *
 * @param {*} value Callback result.
 * @returns {ArrayBuffer[]} Unique buffers of the top-level typed arrays and
 *   buffers in the result, or of the result itself.
 */
function collectTransfer(value)
{
  const buffers = new Set();
  const add = item =>
  {
    if (item instanceof ArrayBuffer) buffers.add(item);
    else if (ArrayBuffer.isView(item) && item.buffer instanceof ArrayBuffer) buffers.add(item.buffer);
  };

  add(value);
  if (value !== null && typeof value === "object" && !ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer))
  {
    for (const item of Object.values(value)) add(item);
  }
  return [ ...buffers ];
}

/** Installs the callback host on a worker scope. */
export class BlueCallbackManWorker
{
  /**
   * Answers the manager's messages with the named callbacks.
   *
   * @param {object} scope Worker global scope; uses `addEventListener` and `postMessage`.
   * @param {Object<string, (context: *, options: {signal: AbortSignal}) => *>} callbacks Callbacks by name.
   * @returns {() => void} Uninstalls the host.
   */
  static install(scope, callbacks)
  {
    const running = new Map();

    const onMessage = async event =>
    {
      const message = event.data;
      if (message.kind === "cancel")
      {
        const controller = running.get(message.id);
        if (controller) controller.abort();
        return;
      }
      if (message.kind !== "run") return;

      const controller = new AbortController();
      running.set(message.id, controller);
      try
      {
        const callback = callbacks[message.name];
        if (typeof callback !== "function") throw new Error(`BlueCallbackManWorker: no callback named "${message.name}".`);

        const result = await callback(message.context, { signal: controller.signal });
        scope.postMessage({ kind: "done", id: message.id, result }, collectTransfer(result));
      }
      catch (error)
      {
        scope.postMessage({
          kind: "error",
          id: message.id,
          error: { name: error?.name || "Error", message: error?.message || String(error), code: error?.code }
        });
      }
      finally
      {
        running.delete(message.id);
      }
    };

    scope.addEventListener("message", onMessage);
    return () => scope.removeEventListener("message", onMessage);
  }
}

CjsSchema.meta.define("BlueCallbackManWorker")(BlueCallbackManWorker);
