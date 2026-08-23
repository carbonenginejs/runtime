/**
 * Creates the error a resource raises when nothing can read its source.
 *
 * Every resource that loads itself needs this exact refusal, and it must say
 * the same thing each time: a resource imports no formats, so being unable to
 * read something is a REGISTRATION gap rather than a corrupt file, and the
 * message has to point at the registration.
 *
 * @param {string} className Resource raising it.
 * @param {string} extension The resource's extension, if it has one.
 * @param {string|null} [output] The representation asked for, when one was.
 * @returns {Error} Coded `CJS_RESOURCE_FORMAT_REQUIRED`.
 */
export function resourceFormatRequiredError(className, extension, output = null) {
  const source = extension ? `".${String(extension).replace(/^\./u, "")}"` : "this source";
  const error = new Error(
    `Nothing is registered to read ${source}${output ? ` as "${output}"` : ""} `
    + `for ${className}. Register a route for it on the format store, or pass `
    + "options.format. The resource imports no formats itself, so that it does "
    + "not drag every reader of its family into anything that touches it."
  );
  error.code = "CJS_RESOURCE_FORMAT_REQUIRED";
  error.className = className;
  error.extension = extension || "";
  error.output = output || null;
  return error;
}

/**
 * Creates a coded error at a public resource API boundary for the resource
 * payload lifecycle.
 */
export function resourceBoundaryError(className, methodName, reason) {
  const error = new Error(`${className}.${methodName} is owned by engine adapters in CarbonEngineJS. ${reason || ""}`.trim());
  error.code = "CJS_RESOURCE_ENGINE_BOUNDARY";
  error.className = className;
  error.methodName = methodName;
  return error;
}

/**
 * Creates a coded error for an invalid resource payload for the resource payload
 * lifecycle.
 */
export function resourcePayloadError(className, reason, field = "", cause = null) {
  const location = field ? `${className} payload.${field}` : `${className} payload`;
  const error = new TypeError(`${location} is invalid. ${reason || ""}`.trim());
  error.code = "CJS_RESOURCE_PAYLOAD_INVALID";
  error.className = className;
  error.field = field;
  if (cause) error.cause = cause;
  return error;
}

/**
 * Validates that a resource payload is a plain object for the resource payload
 * lifecycle.
 */
export function assertResourcePayloadObject(className, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
    throw resourcePayloadError(className, "Expected a plain payload object.");
  }
  return payload;
}

/**
 * Validates that a resource payload field is an array for the resource payload
 * lifecycle.
 */
export function assertResourcePayloadArray(className, payload, field) {
  if (!Array.isArray(payload[field])) {
    throw resourcePayloadError(className, "Expected an array.", field);
  }
  return payload[field];
}

/**
 * Validates a resource payload against the supplied field contract for the
 * resource payload lifecycle.
 */
export function validateResourcePayload(className, payload, validator) {
  assertResourcePayloadObject(className, payload);
  try {
    return validator(payload);
  } catch (cause) {
    if (cause?.code === "CJS_RESOURCE_PAYLOAD_INVALID") throw cause;
    throw resourcePayloadError(className, cause?.message || "Validation failed.", "", cause);
  }
}
