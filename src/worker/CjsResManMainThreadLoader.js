/**
 * Direct execution strategy that reads through a structural source and invokes registered format facades on the caller thread.
 *
 * It is used when no browser worker is selected or when a source or format
 * does not declare a worker-safe operation.
 */
export class CjsResManMainThreadLoader
{
  /**
   * Read through an injected resource source.
   *
   * @param {object|Function} source Source exposing `Read(path, options)`.
   * @param {string} path Normalized resource path.
   * @param {object} [options={}] Source read options.
   * @returns {*} Source result or promise.
   */
  Read(source, path, options = {})
  {
    AssertResourceSource(source);
    return source.Read(path, options);
  }

  /**
   * Main-thread loaders never claim worker execution.
   *
   * @returns {false}
   */
  CanReadFormat()
  {
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
  ReadFormat(descriptor, input, formatOptions = {})
  {
    return readFormatOnCurrentThread(descriptor, input, formatOptions);
  }

  /**
   * Main-thread execution owns no pending worker requests.
   *
   * @returns {0}
   */
  GetPendingCount()
  {
    return 0;
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
function readFormatOnCurrentThread(
  descriptor,
  input,
  formatOptions = {}
)
{
  const Format = descriptor?.Format;

  if (typeof Format !== "function")
  {
    throw new TypeError("Resource format descriptor requires a Format class.");
  }
  if (typeof Format.readAsync === "function")
  {
    return Format.readAsync(input, formatOptions);
  }
  if (typeof Format.read === "function")
  {
    return Format.read(input, formatOptions);
  }

  const reader = new Format(formatOptions);

  if (typeof reader.ReadAsync === "function")
  {
    return reader.ReadAsync(input, formatOptions);
  }
  if (typeof reader.Read === "function")
  {
    return reader.Read(input, formatOptions);
  }

  throw new TypeError(`${Format.name} does not expose a read operation.`);
}

function AssertResourceSource(source)
{
  if (!source || (typeof source !== "object" && typeof source !== "function")
    || typeof source.Read !== "function")
  {
    throw new TypeError("Resource source must provide Read(path, options).");
  }
}
