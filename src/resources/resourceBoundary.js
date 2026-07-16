export function ResourceBoundaryError(className, methodName, reason) {
  const error = new Error(`${className}.${methodName} is owned by engine adapters in CarbonEngineJS. ${reason || ""}`.trim());
  error.code = "CJS_RESOURCE_ENGINE_BOUNDARY";
  error.className = className;
  error.methodName = methodName;
  return error;
}

export function CarbonStubError(className, methodName, reason) {
  const error = new Error(`${className}.${methodName} is a CarbonEngineJS resource stub and is not implemented yet. ${reason || ""}`.trim());
  error.code = "CJS_RESOURCE_NOT_IMPLEMENTED";
  error.className = className;
  error.methodName = methodName;
  return error;
}

export function ResourcePayloadError(className, reason, field = "", cause = null) {
  const location = field ? `${className} payload.${field}` : `${className} payload`;
  const error = new TypeError(`${location} is invalid. ${reason || ""}`.trim());
  error.code = "CJS_RESOURCE_PAYLOAD_INVALID";
  error.className = className;
  error.field = field;
  if (cause) error.cause = cause;
  return error;
}

export function AssertResourcePayloadObject(className, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
    throw ResourcePayloadError(className, "Expected a plain payload object.");
  }
  return payload;
}

export function AssertResourcePayloadArray(className, payload, field) {
  if (!Array.isArray(payload[field])) {
    throw ResourcePayloadError(className, "Expected an array.", field);
  }
  return payload[field];
}

export function ValidateResourcePayload(className, payload, validator) {
  AssertResourcePayloadObject(className, payload);
  try {
    return validator(payload);
  } catch (cause) {
    if (cause?.code === "CJS_RESOURCE_PAYLOAD_INVALID") throw cause;
    throw ResourcePayloadError(className, cause?.message || "Validation failed.", "", cause);
  }
}
