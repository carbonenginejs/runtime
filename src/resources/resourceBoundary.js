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
