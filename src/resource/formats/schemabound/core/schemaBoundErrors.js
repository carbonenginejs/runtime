/**
 * Builds the error every part of this format throws, with one code.
 *
 * @param {string} message Error message.
 * @param {object|null} [extra=null] Extra properties copied onto the error.
 * @returns {TypeError} Error with `code` `CJS_SCHEMA_BOUND_FORMAT_INVALID`.
 */
export function SchemaBoundError(message, extra = null) {
  const error = new TypeError(message);

  error.code = "CJS_SCHEMA_BOUND_FORMAT_INVALID";

  return Object.assign(error, extra || {});
}

export default SchemaBoundError;
