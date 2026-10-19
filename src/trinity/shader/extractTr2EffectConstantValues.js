function fail(message, code = "CJS_TRINITY_EFFECT_CONSTANT_INVALID")
{
  const error = new Error(`Tr2Effect constant extraction: ${message}`);
  error.code = code;
  throw error;
}

/** Native dynamic parameters expose GetParameterName (Tr2Effect.cpp:1091,1559);
 * authored Tr2ConstantEffectParameter records instead store name (Tr2Effect.h:41-45). */
function parameterName(parameter, collectionName)
{
  return collectionName === "parameters" ? parameter.GetParameterName() : parameter.name;
}

function indexParameters(effect)
{
  const result = new Map();
  const collections = [
    ["parameters", effect?.parameters],
    ["constParameters", effect?.constParameters]
  ];
  for (const [collectionName, values] of collections)
  {
    if (values == null) continue;
    if (!Array.isArray(values)) fail(`effect.${collectionName} must be an array`);
    for (const parameter of values)
    {
      const name = parameterName(parameter, collectionName);
      if (!name) continue;
      if (typeof name !== "string") fail(`effect.${collectionName} contains a non-string parameter name`);
      if (result.has(name))
      {
        fail(`parameter ${JSON.stringify(name)} is duplicated across effect constant collections`, "CJS_TRINITY_EFFECT_CONSTANT_DUPLICATE");
      }
      result.set(name, { parameter, collectionName });
    }
  }
  return result;
}

function validateConstant(constant, names)
{
  const name = constant?.name;
  if (typeof name !== "string" || name === "" || names.has(name))
  {
    fail("reflected constants contain a malformed or duplicate name", "CJS_TRINITY_EFFECT_CONSTANT_REFLECTION");
  }
  names.add(name);
  if (constant.type !== 0 || constant.elements !== 0
    || !Number.isInteger(constant.dimension) || constant.dimension < 1 || constant.dimension > 4)
  {
    fail(`reflected constant ${JSON.stringify(name)} has an unsupported layout`, "CJS_TRINITY_EFFECT_CONSTANT_LAYOUT");
  }
  return { name, type: constant.type, dimension: constant.dimension };
}

function normalizeValue(value, dimension, name, allowPrefix = false)
{
  if (dimension === 1 && typeof value === "number") return [value];
  if (!Array.isArray(value) && !ArrayBuffer.isView(value))
  {
    fail(`parameter ${JSON.stringify(name)} did not provide numeric constant data`, "CJS_TRINITY_EFFECT_CONSTANT_UNSUPPORTED");
  }
  if (typeof value.length !== "number"
    || (allowPrefix ? value.length < dimension : value.length !== dimension))
  {
    fail(`parameter ${JSON.stringify(name)} must provide exactly ${dimension} values`, "CJS_TRINITY_EFFECT_CONSTANT_DIMENSION");
  }
  return Array.from(value).slice(0, dimension);
}

function copyParameterValue(entry, constant)
{
  const { parameter, collectionName } = entry;
  let values;
  // Tr2Material.cpp:325-337 consumes the required dynamic constant writer.
  if (collectionName === "parameters")
  {
    const out = new Float32Array(constant.dimension);
    out.fill(Number.NaN);
    parameter.CopyValueToEffect(constant.type, out, constant.dimension * 4);
    values = Array.from(out);
  }
  else
  {
    values = normalizeValue(parameter.value, constant.dimension, constant.name, true);
  }

  for (let index = 0; index < values.length; index++)
  {
    const value = values[index];
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isFinite(Math.fround(value)))
    {
      fail(`parameter ${JSON.stringify(constant.name)} value ${index} is not a finite float32`, "CJS_TRINITY_EFFECT_CONSTANT_VALUE");
    }
  }
  return values;
}

/**
 * Extract reflected, stage-local float constants from a Tr2Effect.
 * Dynamic parameters use CopyValueToEffect so rerouting and sRGB conversion
 * are preserved. Constant parameters supply the requested prefix of their
 * stored value. Only the reflected names are read, from `effect.parameters`
 * and `effect.constParameters`.
 *
 * Fails closed, throwing an Error whose `code` names the failure:
 * - `CJS_TRINITY_EFFECT_CONSTANT_INVALID`: missing effect or a malformed
 *   parameter collection;
 * - `CJS_TRINITY_EFFECT_CONSTANT_REFLECTION`: empty reflection list, or a
 *   malformed or duplicate reflected name;
 * - `CJS_TRINITY_EFFECT_CONSTANT_DUPLICATE`: a parameter name in both
 *   collections, or twice in one;
 * - `CJS_TRINITY_EFFECT_CONSTANT_MISSING`: no parameter for a reflected name;
 * - `CJS_TRINITY_EFFECT_CONSTANT_LAYOUT`: reflected type or element count not
 *   0, or dimension outside 1-4;
 * - `CJS_TRINITY_EFFECT_CONSTANT_UNSUPPORTED`: a non-numeric value, such as a
 *   resource;
 * - `CJS_TRINITY_EFFECT_CONSTANT_DIMENSION`: wrong value count;
 * - `CJS_TRINITY_EFFECT_CONSTANT_VALUE`: a value that is not a finite float32.
 *
 * @param {object} effect Tr2Effect-like material instance.
 * @param {object[]} reflectedConstants Reflected constants for one local buffer.
 * @returns {Map<string, number[]>} Name-to-number-array values, keyed by the
 *   reflected constant names. The keys come from shader data, so they live in
 *   a Map rather than as object properties; the arrays are detached copies.
 */
export function extractTr2EffectConstantValues(effect, reflectedConstants)
{
  if (!effect || typeof effect !== "object" || Array.isArray(effect))
  {
    fail("effect is required");
  }
  if (!Array.isArray(reflectedConstants) || reflectedConstants.length === 0)
  {
    fail("reflected constants must be a non-empty array", "CJS_TRINITY_EFFECT_CONSTANT_REFLECTION");
  }

  const parameters = indexParameters(effect);
  const names = new Set();
  const result = new Map();
  for (const reflected of reflectedConstants)
  {
    const constant = validateConstant(reflected, names);
    const entry = parameters.get(constant.name);
    if (!entry)
    {
      fail(`parameter ${JSON.stringify(constant.name)} is missing`, "CJS_TRINITY_EFFECT_CONSTANT_MISSING");
    }
    result.set(constant.name, copyParameterValue(entry, constant));
  }
  return result;
}
