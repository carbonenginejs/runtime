// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Source: trinity/trinity/Resources/Tr2EffectRes.cpp
// Source: trinity/trinity/Resources/Tr2EffectRes_Blue.cpp
import { CjsSchema, carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../CjsResource.js";
import { validateResourcePayload } from "../resourceBoundary.js";
import { CjsCarbonEffectReader } from "../../format/carbonEffect/CjsCarbonEffectReader.js";
import { Tr2Shader } from "./Tr2Shader.js";
import { ResourceRequirement } from "../ResourceRequirement.js";

const globalEffectOptions = [];

/**
 * Tr2EffectRes resource record.
 *
 * This stores effect/shader payload facts. Engine-gpu decides shader module,
 * pipeline, bind group, and sampler realization.
 */
export class Tr2EffectRes extends CjsResource
{

  #shaders = new Map();

  #reader = null;

  /**
   * Read a Carbon effect container and take ownership of its reader.
   *
   * Carbon's `DoLoad` (`Tr2EffectRes.cpp:137`) does exactly this work: it clears
   * the previous state, then fills `m_version`, the string table, the permutation
   * axes and the offset table from the file, and stops there. Bodies are read
   * later, one at a time, by `GetShader`. The one difference is where the bytes
   * come from — Carbon locks its own data stream, and this takes them as an
   * argument.
   *
   * The container is parsed once, here: version, arena, permutation axes and
   * offset table. Bodies are not. Each one is decoded on first request and
   * memoised, by seeking the retained reader rather than re-reading the header —
   * a container with 512 permutations that renders two of them parses two bodies.
   *
   * The reader is retained rather than discarded because a body cannot be read
   * without it: strings are offsets into the container's arena, which lives in
   * the header this method consumed.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} data Container bytes.
   * @param {object|null} options Model values applied after the read.
   * @returns {Tr2EffectRes}
   */
  DoLoad(data, options = null)
  {
    const reader = new CjsCarbonEffectReader(data);
    this.#shaders.clear();
    this.#reader = reader;
    super.SetPayload({
      permutations: reader.permutations.map(axis => ({
        name: axis.name.value,
        options: axis.options.map(option => option.value),
        defaultOption: axis.defaultOption,
        description: axis.description.value,
        type: axis.type
      }))
    });
    this.SetValues(options || {});
    return this;
  }

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
      this.#reader = null;
      super.SetPayload(null);
      return this;
    }
    validateResourcePayload(
      "Tr2EffectRes",
      payload,
      validateEffectPayload
    );
    this.#shaders.clear();
    this.#reader = null;
    super.SetPayload(payload);
    this.SetValues(options || {});
    return this;
  }

  /**
   * Select and hydrate one canonical shader from the complete permutation
   * graph exposed by a Carbon WebGL/Carbon WebGPU raw package.
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

    if (!this.#reader)
    {
      return null;
    }

    const shader = Tr2Shader.fromCarbonBinary(this.#reader, index);
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
    this.#reader = null;
    return super.ReleasePayload();
  }

  static payload = ResourceRequirement.SHADER;

}

/**
 * Validate an attached permutation payload.
 *
 * Carbon has no equivalent: it fills `m_permutations` from the file and never
 * accepts one from a caller. This exists only so an attached payload cannot
 * silently produce a wrong permutation index, and it checks the one thing the
 * index arithmetic depends on - that every axis has options and a default that
 * addresses one of them.
 *
 * @param {object} payload Attached payload.
 */
function validateEffectPayload(payload)
{
  if (!Array.isArray(payload.permutations))
  {
    throw new TypeError(
      "Tr2EffectRes payload requires a permutations array"
    );
  }
  payload.permutations.forEach(normalizePermutationAxis);
}

/**
 * The permutation axes an attached payload declares.
 *
 * @param {object|null} payload Attached payload.
 * @returns {Array<object>} Normalized axes, empty when there are none.
 */
function getPermutationAxes(payload)
{
  if (!Array.isArray(payload?.permutations))
  {
    return [];
  }
  return payload.permutations.map(normalizePermutationAxis);
}

/**
 * Normalize and validate one permutation axis.
 *
 * @param {object} axis Candidate axis.
 * @returns {object} Owned, validated axis.
 */
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

/**
 * The number of permutations the axes describe - the product of their option
 * counts, which is also the number of offset-table rows a dense container has.
 *
 * @param {object|null} payload Attached payload.
 * @returns {number|null} Permutation count, or null when no axes are declared.
 */
function getPermutationVariantCount(payload)
{
  const axes = getPermutationAxes(payload);
  if (!axes.length)
  {
    return null;
  }
  return axes.reduce((count, axis) => count * axis.options.length, 1);
}

/**
 * Return an owned snapshot of the current global option overrides.
 *
 * Carbon returns a const reference to the live vector; a JS caller cannot be
 * held to that, so this copies rather than exposing the array for mutation.
 *
 * @returns {Array<{name:string,value:string}>} Global option choices.
 */
export function GetGlobalEffectOptions()
{
  return globalEffectOptions.map(option => ({ ...option }));
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
    GetShader: [ carbon.method, impl.adapted, impl.reason("Carbon reads the selected body from the compiled effect bytes and registers renderer handles; CarbonEngineJS reads the same bytes and stops at the device-free graph, leaving GPU realization to the engine.") ],
    GetShaderByIndex: [ impl.custom, impl.reason("Carbon selects compiled bodies through GetShader; CarbonEngineJS exposes exact package-index hydration for deterministic package consumers and tests.") ],
    GetPermutationDescription: [ carbon.method, impl.adapted, impl.reason("Carbon exposes a Python tuple through Blue; CarbonEngineJS returns a JSON-friendly plain axis description.") ],
    ReleaseResources: [ carbon.method, impl.adapted, impl.reason("Backend resources are engine-owned; the resource-side release clears only hydrated device-free shader graphs.") ]
  }
});
