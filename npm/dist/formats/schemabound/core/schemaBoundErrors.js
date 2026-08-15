/** Builds the error every part of this format throws, with one code. */
function SchemaBoundError(message, extra = null) {
  const error = new TypeError(message);
  error.code = "CJS_SCHEMA_BOUND_INVALID";
  return Object.assign(error, extra || {});
}

export { SchemaBoundError };
//# sourceMappingURL=schemaBoundErrors.js.map
