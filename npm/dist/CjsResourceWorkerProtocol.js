/**
 * Stable operations understood by the bundled runtime-resource module worker.
 *
 * Custom workers may implement the same envelope while adding their own
 * operation names.
 */
const CjsResourceWorkerOperation = Object.freeze({
  FETCH: "source.fetch",
  FORMAT_READ: "format.read"
});

/**
 * Stable message kinds exchanged with a runtime-resource worker.
 */
const CjsResourceWorkerMessage = Object.freeze({
  CANCEL: "cancel",
  EXECUTE: "execute",
  RESULT: "result"
});

export { CjsResourceWorkerMessage, CjsResourceWorkerOperation };
//# sourceMappingURL=CjsResourceWorkerProtocol.js.map
