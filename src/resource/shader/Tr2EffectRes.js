// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Source: trinity/trinity/Resources/Tr2EffectRes.cpp
// Source: trinity/trinity/Resources/Tr2EffectRes_Blue.cpp
import { CjsSchema, carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../CjsResource.js";
import { validateResourcePayload } from "../resourceBoundary.js";
import { Tr2Shader } from "./Tr2Shader.js";

const globalEffectOptions = [];
const SHA256 = /^[0-9a-f]{64}$/u;
const UINT8_MAX = 0xff;
const UINT32_MAX = 0xffffffff;
const MAX_EFFECT_PERMUTATIONS = 0x10000;

/**
 * Tr2EffectRes resource record.
 *
 * This stores effect/shader payload facts. Engine-gpu decides shader module,
 * pipeline, bind group, and sampler realization.
 */
export class Tr2EffectRes extends CjsResource
{

  #shaders = new Map();

  /** Creates a Tr2EffectRes with caller-provided initial state. */
  constructor(values = null)
  {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Attach a plain shader/effect payload.
   *
   * @param {object|null} payload
   * @param {object|null} options
   * @returns {Tr2EffectRes}
   */
  SetPayload(payload = null, options = null)
  {
    if (payload === null)
    {
      this.#shaders.clear();
      super.SetPayload(null);
      return this;
    }
    validateResourcePayload(
      "Tr2EffectRes",
      payload,
      validateEffectPayload
    );
    this.#shaders.clear();
    super.SetPayload(payload);
    this.SetValues(options || {});
    return this;
  }

  /**
   * Select and hydrate one canonical shader from the complete permutation
   * graph exposed by a CEWG/CEWGPU raw package.
   *
   * Global options have Carbon-compatible precedence over caller options.
   * Unknown option values retain the authored default.
   *
   * @param {Array<object>|Map<string,string>} options Local name/value choices.
   * @param {number|null} count Number of local entries to consider.
   * @returns {Tr2Shader|null} Selected device-free shader reflection.
   */
  GetShader(options = [], count = null)
  {
    const axes = getPermutationAxes(this.GetPayload());
    if (!axes.length)
    {
      const portableIndex = Tr2Shader.isPortableReflection(this.GetPayload())
        ? this.GetPayload().permutationIndex
        : 0;
      return this.GetShaderByIndex(portableIndex);
    }
    const localOptions = normalizeShaderOptions(options);
    const localCount = Number.isSafeInteger(count)
      ? Math.max(0, Math.min(count, localOptions.length))
      : localOptions.length;
    let multiplier = 1;
    let index = 0;

    for (const axis of axes)
    {
      let selectedIndex = axis.defaultOption;
      const globalOption = globalEffectOptions.find(
        option => option.name === axis.name
      );
      if (globalOption)
      {
        const requestedIndex = axis.options.indexOf(globalOption.value);
        if (requestedIndex >= 0)
        {
          selectedIndex = requestedIndex;
        }
      }
      else
      {
        for (let optionIndex = 0; optionIndex < localCount; optionIndex += 1)
        {
          const localOption = localOptions[optionIndex];
          if (localOption.name !== axis.name)
          {
            continue;
          }
          const requestedIndex = axis.options.indexOf(localOption.value);
          if (requestedIndex >= 0)
          {
            selectedIndex = requestedIndex;
          }
        }
      }

      index += selectedIndex * multiplier;
      multiplier *= axis.options.length;
    }

    return this.GetShaderByIndex(index);
  }

  /**
   * Hydrate one exact permutation-table index and cache the resulting runtime
   * graph for this payload.
   *
   * @param {number} index Exact permutation index.
   * @returns {Tr2Shader|null} Canonical shader or null when reflection is absent.
   */
  GetShaderByIndex(index)
  {
    if (!Number.isSafeInteger(index) || index < 0)
    {
      throw new TypeError(
        "Tr2EffectRes shader index must be a non-negative safe integer"
      );
    }
    if (this.#shaders.has(index))
    {
      return this.#shaders.get(index);
    }

    const payload = this.GetPayload();
    const variantCount = getPermutationVariantCount(payload);
    if (variantCount !== null && index >= variantCount)
    {
      return null;
    }

    const portable = getPortableReflection(payload, index);
    if (!portable)
    {
      return null;
    }
    if (portable.permutationIndex !== index)
    {
      throw new Error(
        `Portable effect reflection index ${portable.permutationIndex} does not match requested index ${index}`
      );
    }

    const shader = Tr2Shader.fromPortable(portable);
    this.#shaders.set(index, shader);
    return shader;
  }

  /**
   * Return a small JSON-friendly permutation description.
   *
   * @returns {Array<*>}
   */
  GetPermutationDescription()
  {
    const payload = this.GetPayload();
    const axes = getPermutationAxes(payload);
    if (!axes.length && Array.isArray(payload?.permutations))
    {
      return payload.permutations.map(permutation => ({ ...permutation }));
    }
    return axes.map(axis => ({
      name: axis.name,
      options: [ ...axis.options ],
      defaultOption: axis.defaultOption,
      description: axis.description,
      type: axis.type
    }));
  }

  /**
   * Drop hydrated shader graphs while retaining the validated CPU payload.
   */
  ReleaseResources()
  {
    this.#shaders.clear();
  }

  /** Release the payload and every shader graph hydrated from it. */
  ReleasePayload()
  {
    this.#shaders.clear();
    return super.ReleasePayload();
  }

  static payload = "shader";

}

/**
 * Merge Carbon-style global effect option overrides.
 *
 * An empty value removes the override. Existing Tr2EffectRes shader caches
 * remain valid objects; callers rebuild effects to request the new selection.
 *
 * @param {Array<object>|Map<string,string>} changes Option changes.
 */
export function ModifyGlobalEffectOptions(changes = [])
{
  for (const change of normalizeShaderOptions(changes))
  {
    const index = globalEffectOptions.findIndex(
      option => option.name === change.name
    );
    if (!change.value)
    {
      if (index >= 0)
      {
        globalEffectOptions.splice(index, 1);
      }
    }
    else if (index >= 0)
    {
      globalEffectOptions[index] = change;
    }
    else
    {
      globalEffectOptions.push(change);
    }
  }
}

/**
 * Return an owned snapshot of the current global option overrides.
 *
 * @returns {Array<{name:string,value:string}>} Global option choices.
 */
export function GetGlobalEffectOptions()
{
  return globalEffectOptions.map(option => ({ ...option }));
}

function validateEffectPayload(payload)
{
  const graph = payload.permutationGraph;
  if (graph !== null && graph !== undefined)
  {
    validatePermutationGraph(graph);
  }
  else if (Array.isArray(payload.permutations))
  {
    if (payload.permutations.every(permutation =>
      Array.isArray(permutation?.options)))
    {
      payload.permutations.forEach(normalizePermutationAxis);
    }
    else
    {
      validateLegacyPermutationDescription(payload.permutations);
    }
  }
  else if (!Tr2Shader.isPortableReflection(payload))
  {
    throw new TypeError(
      "Tr2EffectRes payload requires a complete permutation graph, permutations array, or one portable reflection"
    );
  }

  if (Array.isArray(payload.portableReflections))
  {
    const expectedCount = getPermutationVariantCount(payload);
    if (expectedCount !== null
      && payload.portableReflections.length !== expectedCount)
    {
      throw new Error(
        "Tr2EffectRes portable reflection count disagrees with its permutations"
      );
    }
    payload.portableReflections.forEach((reflection, index) =>
    {
      if (!Tr2Shader.isPortableReflection(reflection)
        || reflection.permutationIndex !== index)
      {
        throw new Error(
          `Tr2EffectRes portable reflection ${index} is malformed`
        );
      }
    });
  }
}

function validateLegacyPermutationDescription(permutations)
{
  for (const [ index, permutation ] of permutations.entries())
  {
    if (!permutation
      || typeof permutation !== "object"
      || Array.isArray(permutation)
      || typeof permutation.name !== "string"
      || !permutation.name)
    {
      throw new TypeError(
        `Tr2EffectRes legacy permutation ${index} is malformed`
      );
    }
  }
}

function validatePermutationGraph(graph)
{
  if (!graph || typeof graph !== "object" || Array.isArray(graph)
    || graph.format !== "CJS_EFFECT_PERMUTATION_GRAPH"
    || graph.formatVersion !== 1
    || !graph.coverage || typeof graph.coverage !== "object"
    || Array.isArray(graph.coverage)
    || graph.coverage.permutations !== "complete"
    || graph.coverage.bodies !== "identity-only"
    || graph.coverage.reflection !== "absent"
    || !Array.isArray(graph.axes)
    || !Array.isArray(graph.variants)
    || !Array.isArray(graph.bodies))
  {
    throw new TypeError(
      "Tr2EffectRes requires CJS_EFFECT_PERMUTATION_GRAPH version 1"
    );
  }

  const axisNames = new Set();
  const axes = graph.axes.map((axis, index) =>
    validatePermutationAxis(axis, index, axisNames));
  const expectedCount = getPermutationProduct(axes);
  if (graph.variants.length !== expectedCount
    || !graph.bodies.length
    || graph.bodies.length > graph.variants.length)
  {
    throw new Error(
      "Tr2EffectRes permutation graph requires complete variants and bodies"
    );
  }

  const bodies = new Map();
  const bodyDigests = new Set();
  graph.bodies.forEach((body, bodyIndex) =>
  {
    if (!body || typeof body !== "object" || Array.isArray(body)
      || typeof body.key !== "string" || !body.key
      || body.key !== body.key.trim()
      || !Number.isSafeInteger(body.byteLength) || body.byteLength < 1
      || body.byteLength > UINT32_MAX
      || typeof body.sha256 !== "string" || !SHA256.test(body.sha256)
      || bodies.has(body.key)
      || bodyDigests.has(body.sha256))
    {
      throw new Error(
        `Tr2EffectRes permutation body ${bodyIndex} is malformed or duplicated`
      );
    }
    bodyDigests.add(body.sha256);
    bodies.set(body.key, {
      byteLength: body.byteLength,
      references: 0
    });
  });

  const bodyKeyBySourceRecord = new Map();
  const sourceRecords = [];
  graph.variants.forEach((variant, permutationIndex) =>
  {
    const expectedOptions = decodePermutationOptions(permutationIndex, axes);
    if (!variant || typeof variant !== "object" || Array.isArray(variant)
      || variant.permutationIndex !== permutationIndex
      || !Array.isArray(variant.optionIndices)
      || variant.optionIndices.length !== expectedOptions.length
      || variant.optionIndices.some((value, index) =>
        value !== expectedOptions[index])
      || typeof variant.bodyKey !== "string"
      || !bodies.has(variant.bodyKey))
    {
      throw new Error(
        `Tr2EffectRes permutation variant ${permutationIndex} is malformed`
      );
    }

    const sourceRecord = validatePermutationSourceRecord(
      variant.sourceRecord,
      permutationIndex
    );
    const body = bodies.get(variant.bodyKey);
    if (sourceRecord.byteLength !== body.byteLength)
    {
      throw new Error(
        `Tr2EffectRes permutation variant ${permutationIndex} body length disagrees`
      );
    }
    const recordKey = `${sourceRecord.offset}:${sourceRecord.byteLength}`;
    const existingBodyKey = bodyKeyBySourceRecord.get(recordKey);
    if (existingBodyKey && existingBodyKey !== variant.bodyKey)
    {
      throw new Error(
        `Tr2EffectRes source record ${recordKey} maps to multiple bodies`
      );
    }
    bodyKeyBySourceRecord.set(recordKey, variant.bodyKey);
    sourceRecords.push(sourceRecord);
    body.references += 1;
  });

  validateDisjointPermutationRecords(sourceRecords);
  for (const [ bodyKey, body ] of bodies)
  {
    if (!body.references)
    {
      throw new Error(
        `Tr2EffectRes permutation body ${bodyKey} is unreferenced`
      );
    }
  }
}

function validatePermutationAxis(axis, index, names)
{
  if (!axis || typeof axis !== "object" || Array.isArray(axis)
    || axis.index !== index
    || typeof axis.name !== "string" || !axis.name
    || axis.name !== axis.name.trim() || names.has(axis.name)
    || !Array.isArray(axis.options) || !axis.options.length
    || axis.options.length > UINT8_MAX
    || !Number.isSafeInteger(axis.defaultOption)
    || axis.defaultOption < 0
    || axis.defaultOption >= axis.options.length
    || typeof axis.description !== "string"
    || !Number.isSafeInteger(axis.type)
    || axis.type < 0 || axis.type > UINT8_MAX)
  {
    throw new Error(
      `Tr2EffectRes permutation axis ${index} is malformed or duplicated`
    );
  }
  names.add(axis.name);
  const options = new Set();
  for (const option of axis.options)
  {
    if (typeof option !== "string" || !option
      || option !== option.trim() || options.has(option))
    {
      throw new Error(
        `Tr2EffectRes permutation axis ${index} options are malformed`
      );
    }
    options.add(option);
  }
  return normalizePermutationAxis(axis);
}

function getPermutationProduct(axes)
{
  let product = 1;
  for (const axis of axes)
  {
    product *= axis.options.length;
    if (!Number.isSafeInteger(product)
      || product < 1
      || product > MAX_EFFECT_PERMUTATIONS)
    {
      throw new Error(
        "Tr2EffectRes permutation count exceeds the implementation limit"
      );
    }
  }
  return product;
}

function decodePermutationOptions(permutationIndex, axes)
{
  let value = permutationIndex;
  return axes.map(axis =>
  {
    const optionIndex = value % axis.options.length;
    value = Math.floor(value / axis.options.length);
    return optionIndex;
  });
}

function validatePermutationSourceRecord(record, permutationIndex)
{
  const offset = record?.offset;
  const byteLength = record?.byteLength;
  const end = offset + byteLength;
  if (!record || typeof record !== "object" || Array.isArray(record)
    || !Number.isSafeInteger(offset) || offset < 0 || offset > UINT32_MAX
    || !Number.isSafeInteger(byteLength) || byteLength < 1
    || byteLength > UINT32_MAX
    || !Number.isSafeInteger(end)
    || end > UINT32_MAX + 1)
  {
    throw new Error(
      `Tr2EffectRes permutation variant ${permutationIndex} source record is malformed`
    );
  }
  return { offset, byteLength };
}

function validateDisjointPermutationRecords(records)
{
  const unique = new Map();
  for (const record of records)
  {
    const key = `${record.offset}:${record.byteLength}`;
    if (!unique.has(key))
    {
      unique.set(key, {
        offset: record.offset,
        end: record.offset + record.byteLength
      });
    }
  }
  const ordered = Array.from(unique.values()).sort((left, right) =>
    left.offset - right.offset || left.end - right.end);
  for (let index = 1; index < ordered.length; index += 1)
  {
    if (ordered[index].offset < ordered[index - 1].end)
    {
      throw new Error(
        "Tr2EffectRes permutation source body records partially overlap"
      );
    }
  }
}

function getPermutationAxes(payload)
{
  if (!payload)
  {
    return [];
  }
  if (payload.permutationGraph)
  {
    return payload.permutationGraph.axes.map(normalizePermutationAxis);
  }
  if (Array.isArray(payload.permutations)
    && payload.permutations.every(permutation =>
      Array.isArray(permutation?.options)))
  {
    return payload.permutations.map(normalizePermutationAxis);
  }
  return [];
}

function normalizePermutationAxis(axis)
{
  if (!axis || typeof axis !== "object" || Array.isArray(axis)
    || typeof axis.name !== "string" || !axis.name
    || !Array.isArray(axis.options) || !axis.options.length
    || axis.options.some(option => typeof option !== "string" || !option)
    || !Number.isSafeInteger(axis.defaultOption)
    || axis.defaultOption < 0
    || axis.defaultOption >= axis.options.length)
  {
    throw new TypeError("Tr2EffectRes permutation axis is malformed");
  }
  return {
    name: axis.name,
    options: [ ...axis.options ],
    defaultOption: axis.defaultOption,
    description: String(axis.description ?? ""),
    type: Number(axis.type ?? 0)
  };
}

function getPermutationVariantCount(payload)
{
  if (Array.isArray(payload?.permutationGraph?.variants))
  {
    return payload.permutationGraph.variants.length;
  }
  const axes = getPermutationAxes(payload);
  if (axes.length)
  {
    return axes.reduce((count, axis) => count * axis.options.length, 1);
  }
  return null;
}

function getPortableReflection(payload, index)
{
  if (!payload)
  {
    return null;
  }
  if (typeof payload.GetPortableEffectReflection === "function")
  {
    return payload.GetPortableEffectReflection(index);
  }
  if (typeof payload.getPortableEffectReflection === "function")
  {
    return payload.getPortableEffectReflection(index);
  }
  if (Tr2Shader.isPortableReflection(payload))
  {
    return index === payload.permutationIndex ? payload : null;
  }
  if (Array.isArray(payload.portableReflections))
  {
    return payload.portableReflections[index] ?? null;
  }
  return null;
}

function normalizeShaderOptions(options)
{
  if (options instanceof Map)
  {
    return Array.from(options, ([ name, value ]) => ({
      name: String(name),
      value: String(value)
    }));
  }
  if (!Array.isArray(options))
  {
    return [];
  }
  return options.map(option => ({
    name: String(option?.name ?? ""),
    value: String(option?.value ?? "")
  }));
}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectRes, {
  className: "Tr2EffectRes",
  family: "resources",
  methods: {
    GetShader: [ carbon.method, impl.adapted, impl.reason("Carbon reads the selected body directly from compiled effect bytes and registers renderer handles; CarbonEngineJS hydrates the format package's validated portable reflection without realizing GPU state.") ],
    GetShaderByIndex: [ impl.custom, impl.reason("Carbon selects compiled bodies through GetShader; CarbonEngineJS exposes exact package-index hydration for deterministic package consumers and tests.") ],
    GetPermutationDescription: [ carbon.method, impl.adapted, impl.reason("Carbon exposes a Python tuple through Blue; CarbonEngineJS returns a JSON-friendly plain axis description.") ],
    ReleaseResources: [ carbon.method, impl.adapted, impl.reason("Backend resources are engine-owned; the resource-side release clears only hydrated device-free shader graphs.") ]
  }
});
