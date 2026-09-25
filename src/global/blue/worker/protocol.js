export const Operation = Object.freeze({
  FETCH: "source.fetch",
  FORMAT_READ: "format.read"
});

export const Message = Object.freeze({
  CANCEL: "cancel",
  EXECUTE: "execute",
  RESULT: "result"
});

/**
 * Require a resource source to expose the read the worker boundary calls.
 *
 * A REGISTRATION-BOUNDARY check, not a hedge against our own contract: the
 * source is supplied by the composing application, and refusing it here names
 * the cause while the caller is still on the stack. Both loaders carried an
 * identical copy of this.
 *
 * @param {*} source Caller-supplied resource source.
 * @throws {TypeError} The source cannot be read from.
 */
export function assertResourceSource(source)
{
  if (!source || (typeof source !== "object" && typeof source !== "function")
    || typeof source.Read !== "function")
  {
    throw new TypeError("Resource source must provide Read(path, options).");
  }
}
