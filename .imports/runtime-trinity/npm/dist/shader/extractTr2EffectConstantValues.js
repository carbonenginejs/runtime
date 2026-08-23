function fail(message, code = "CJS_TRINITY_EFFECT_CONSTANT_INVALID") {
  const error = new Error(`Tr2Effect constant extraction: ${message}`);
  error.code = code;
  throw error;
}
function parameterName(parameter) {
  return parameter?.GetParameterName?.() ?? parameter?.getParameterName?.() ?? parameter?.name ?? "";
}
function indexParameters(effect) {
  const result = new Map();
  const collections = [["parameters", effect?.parameters], ["constParameters", effect?.constParameters]];
  for (const [collectionName, values] of collections) {
    if (values == null) continue;
    if (!Array.isArray(values)) fail(`effect.${collectionName} must be an array`);
    for (const parameter of values) {
      const name = parameterName(parameter);
      if (!name) continue;
      if (typeof name !== "string") fail(`effect.${collectionName} contains a non-string parameter name`);
      if (result.has(name)) {
        fail(`parameter ${JSON.stringify(name)} is duplicated across effect constant collections`, "CJS_TRINITY_EFFECT_CONSTANT_DUPLICATE");
      }
      result.set(name, Object.freeze({
        parameter,
        collectionName
      }));
    }
  }
  return result;
}
function validateConstant(constant, names) {
  const name = constant?.name;
  if (typeof name !== "string" || name === "" || names.has(name)) {
    fail("reflected constants contain a malformed or duplicate name", "CJS_TRINITY_EFFECT_CONSTANT_REFLECTION");
  }
  names.add(name);
  if (constant.type !== 0 || constant.elements !== 0 || !Number.isInteger(constant.dimension) || constant.dimension < 1 || constant.dimension > 4) {
    fail(`reflected constant ${JSON.stringify(name)} has an unsupported layout`, "CJS_TRINITY_EFFECT_CONSTANT_LAYOUT");
  }
  return Object.freeze({
    name,
    type: constant.type,
    dimension: constant.dimension
  });
}
function normalizeValue(value, dimension, name, allowPrefix = false) {
  if (dimension === 1 && typeof value === "number") return [value];
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
    fail(`parameter ${JSON.stringify(name)} did not provide numeric constant data`, "CJS_TRINITY_EFFECT_CONSTANT_UNSUPPORTED");
  }
  if (typeof value.length !== "number" || (allowPrefix ? value.length < dimension : value.length !== dimension)) {
    fail(`parameter ${JSON.stringify(name)} must provide exactly ${dimension} values`, "CJS_TRINITY_EFFECT_CONSTANT_DIMENSION");
  }
  return Array.from(value).slice(0, dimension);
}
function copyParameterValue(entry, constant) {
  const {
    parameter,
    collectionName
  } = entry;
  let values;
  if (collectionName === "parameters" && typeof parameter?.CopyValueToEffect === "function") {
    const out = new Float32Array(constant.dimension);
    out.fill(Number.NaN);
    parameter.CopyValueToEffect(constant.type, out, constant.dimension * 4);
    values = Array.from(out);
  } else {
    const value = collectionName === "parameters" && typeof parameter?.GetValue === "function" ? parameter.GetValue() : parameter?.value ?? parameter?.data;
    values = normalizeValue(value, constant.dimension, constant.name, collectionName === "constParameters");
  }
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
      fail(`parameter ${JSON.stringify(constant.name)} value ${index} is not a finite float32`, "CJS_TRINITY_EFFECT_CONSTANT_VALUE");
    }
  }
  return Object.freeze(values);
}

/**
 * Extract reflected, stage-local float constants from a Tr2Effect.
 * Dynamic parameters use CopyValueToEffect so rerouting and sRGB conversion
 * are preserved. Constant parameters are read from their stored vec4 values.
 *
 * @param {object} effect Tr2Effect-like material instance.
 * @param {object[]} reflectedConstants Reflected constants for one local buffer.
 * @returns {object} Frozen plain name-to-number-array values.
 */
function extractTr2EffectConstantValues(effect, reflectedConstants) {
  if (!effect || typeof effect !== "object" || Array.isArray(effect)) {
    fail("effect is required");
  }
  if (!Array.isArray(reflectedConstants) || reflectedConstants.length === 0) {
    fail("reflected constants must be a non-empty array", "CJS_TRINITY_EFFECT_CONSTANT_REFLECTION");
  }
  const parameters = indexParameters(effect);
  const names = new Set();
  const result = {};
  for (const reflected of reflectedConstants) {
    const constant = validateConstant(reflected, names);
    const entry = parameters.get(constant.name);
    if (!entry) {
      fail(`parameter ${JSON.stringify(constant.name)} is missing`, "CJS_TRINITY_EFFECT_CONSTANT_MISSING");
    }
    Object.defineProperty(result, constant.name, {
      value: copyParameterValue(entry, constant),
      enumerable: true,
      configurable: false,
      writable: false
    });
  }
  return Object.freeze(result);
}

export { extractTr2EffectConstantValues };
//# sourceMappingURL=extractTr2EffectConstantValues.js.map
