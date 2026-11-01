import { Tr2DeviceResource } from "../core/device/Tr2DeviceResource.js";
import { TriStorageFlags } from "#consts/graphics";
import { blue as blueService } from "#blue/blue";
import { exposure as be } from "#be";
// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Source: trinity/trinity/Resources/Tr2EffectRes.cpp
// Source: trinity/trinity/Resources/Tr2EffectRes_Blue.cpp
import { CjsSchema } from "#schema";
import { BlueAsyncRes } from "#blue/BlueAsyncRes";
import { ICacheable } from "#blue/ICacheable";
import { validateResourcePayload } from "../resources/resourceBoundary.js";
import { CjsCarbonEffectFormat } from "../../resource/formats/carbonEffect/index.js";
import { Tr2Shader } from "./Tr2Shader.js";
import { EffectCarriesBackendBlock, EffectPlatformFromPath } from "#utils/effectPath";

const globalEffectOptions = [];

/**
 * What this instance's effects are prepared for, committed once by the
 * orchestrator (`Tr2EffectRes.CommitBackend`); null until then.
 *
 * @type {?{source: string, target: string, translator: ?{buildEffect: Function}, permutations: string}}
 */
let effectBackend = null;

/**
 * Tr2EffectRes resource record.
 *
 * This stores effect/shader payload facts. Engine-gpu decides shader module,
 * pipeline, bind group, and sampler realization.
 */
export class Tr2EffectRes extends BlueAsyncRes
{
  /** Carbon: BLUE_REGISTER_RESOURCE_EXTENSION (trinity/trinity/Resources/Tr2EffectRes.cpp:25-34). */
  static extensions = ["SM_1_1", "SM_2_0_LO", "SM_2_0_HI", "SM_3_0_LO", "SM_3_0_HI", "SM_3_0_DEPTH", "SM_LO", "SM_HI", "SM_DEPTH"];

  /** Our Incarna route: .fxt carries v3/v4 effect containers (approved 2026-10-25). */
  static additionalExtensions = ["fxt"];

  /** All declared shader extensions use the same retained Carbon effect reader. */
  static extensionFormats = Object.fromEntries(
    [...Tr2EffectRes.extensions, ...Tr2EffectRes.additionalExtensions].map(extension => [extension, CjsCarbonEffectFormat])
  );

  /**
   * Carbon: Tr2EffectRes::DoLoad (trinity/trinity/Resources/Tr2EffectRes.cpp:137-243).
   * Our LOADING adapter passes bytes unchanged; DoLoad retains the reader to
   * decode permutation bodies on demand. Pre-decoding here loses that lifetime.
   *
   * @cjs
   * @adapted
   * @param {Uint8Array|ArrayBuffer} bytes Compiled effect container.
   * @returns {Uint8Array|ArrayBuffer} The same bytes.
   */
  static readShaderResource(bytes)
  {
    return bytes;
  }



  _shaders = new Map();

  _reader = null;

  /** Whether this container carries per-pass backend blocks; null when unknown. */
  _carriesBackendBlock = null;

  /** Translates one requested permutation on first use; null when every body is present. */
  _translatePermutation = null;

  /** Permutation indices whose body the held container can read; null means all. */
  _translatedIndices = null;

  /** Readers for permutations translated after the load, by permutation index. */
  _permutationReaders = new Map();

  /**
   * Carbon DoLoad (Tr2EffectRes.cpp:137-243). Keep the container reader for lazy
   * permutations; browser backend translation occurs before adopting the reader.
   *
   * @adapted
   * @returns {number} Native LoadingResult.
   */
  _DoLoad()
  {
    // WHAT KIND OF SHADER WAS THIS. The path names the tree the bytes came
    // from. A container in the committed source tree is translated here into
    // the committed target, so its bodies carry the target's backend block; a
    // stored container's tree says whether it has one. Null for a container
    // that arrived without a path - tooling and tests do - and the reader then
    // detects for itself, which is what its parse-twice fallback is for.
    const path = this.GetPath();
    const backend = effectBackend;
    const data = this._dataStream.data;
    let bytes = data;

    this._ClearPermutationTranslator();
    if (backend !== null && backend.source !== backend.target && EffectPlatformFromPath(path) === backend.source)
    {
      bytes = this._TranslateOnLoad(data, backend);
      this._carriesBackendBlock = true;
    }
    else
    {
      this._carriesBackendBlock = EffectCarriesBackendBlock(path);
    }

    const reader = CjsCarbonEffectFormat.read(bytes, { emit: "raw" });
    this._shaders.clear();
    this._permutationReaders.clear();
    this._reader = reader;
    this._effectInfo = {
      permutations: reader.permutations.map(axis => ({
        name: axis.name.value,
        options: axis.options.map(option => option.value),
        defaultOption: axis.defaultOption,
        description: axis.description.value,
        type: axis.type
      }))
    };
    return BlueAsyncRes.LoadingResult.LR_SUCCESS;
  }




  /**
   * Select and hydrate one canonical shader from the complete permutation
   * graph exposed by a Carbon WebGL/Carbon WebGPU raw package.
   *
   * The index is mixed radix with the first axis least significant, so it is
   * meaningful only against this exact effect's axis order. Per axis:
   * - a global option naming the axis owns it outright; its locals are not
   *   consulted, and an invalid global value keeps the default while still
   *   blocking the locals;
   * - otherwise the last valid local option for the axis wins;
   * - an unmatched or invalid value selects the axis's `defaultOption`, which
   *   is often not 0.
   *
   * @adapted Carbon interns the selected body's handles during the read
   *   (Tr2EffectDescription.cpp:587-666); ours are interned later at the Trinity boundary, so
   *   this returns the hydrated shader graph rather than an already-stamped one.
   * @param {Array<object>|Map<string,string>} options Local name/value choices.
   * @param {number|null} count Number of local entries to consider.
   * @returns {Tr2Shader|null} Selected device-free shader reflection.
   */
  GetShader(options = [], count = null)
  {
    const axes = getPermutationAxes(this._effectInfo);
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
   * The container bytes this resource loaded, or null once released.
   *
   * The reader already holds them - a body cannot be read without the arena
   * they live in - so a backend that must read the same container reads THESE
   * rather than fetching the file a second time.
   *
   * @returns {Uint8Array|null}
   */
  GetContainerBytes()
  {
    return this._reader?.bytes ?? null;
  }

  /**
   * Whether this container's bodies carry a per-pass backend block, or null
   * when the resource arrived with no path to tell.
   *
   * @returns {boolean|null}
   */
  CarriesBackendBlock()
  {
    return this._carriesBackendBlock;
  }

  /**
   * Hydrate one exact permutation-table index and cache the resulting runtime
   * graph for this payload.
   *
   * Returns null for an index at or beyond the variant count, or when no
   * reader is retained. It never clamps and never falls back to index 0.
   *
   * Adapted: Carbon selects compiled bodies through GetShader; CarbonEngineJS exposes exact
   * package-index hydration for deterministic package consumers and tests.
   *
   * @cjs
   * @implemented
   * @param {number} index Exact non-negative permutation index.
   * @returns {Tr2Shader|null} The shader, or null when the index is past the end.
   */
  GetShaderByIndex(index)
  {
    if (!Number.isSafeInteger(index) || index < 0)
    {
      throw new TypeError(
        "Tr2EffectRes shader index must be a non-negative safe integer"
      );
    }
    if (this._shaders.has(index))
    {
      return this._shaders.get(index);
    }

    const payload = this._effectInfo;
    const variantCount = getPermutationVariantCount(payload);
    if (variantCount !== null && index >= variantCount)
    {
      return null;
    }

    if (!this._reader)
    {
      return null;
    }

    const shader = Tr2Shader.fromCarbonBinary(this._ReaderFor(index), index, this._carriesBackendBlock);
    this._shaders.set(index, shader);
    return shader;
  }

  /**
   * Hands this resource a way to translate permutations its container lacks.
   *
   * Not Carbon: Carbon's containers are compiled offline with every permutation
   * present. A browser backend translates the shipped dx11 container in
   * memory, and translating every permutation of a large hull shader costs
   * seconds, so the load translates only the default one and the rest are
   * translated here the first time `GetShaderByIndex` asks for them.
   *
   * Called by `_TranslateOnLoad` during `DoLoad`, which clears any earlier
   * translator first, so a container loaded as stored never keeps one.
   *
   * @param {(permutation: Array<{name: string, value: string}>) => {bytes: Uint8Array, indices: number[]}} translate
   *   Translates the named permutation and reports every index the result carries a body for.
   * @param {number[]} translatedIndices Indices the loaded container already carries a body for.
   * @returns {void}
   */
  SetPermutationTranslator(translate, translatedIndices)
  {
    this._translatePermutation = translate;
    this._translatedIndices = new Set(translatedIndices);
    this._permutationReaders.clear();
  }

  /**
   * Commits what this instance's effects are prepared for: the effect tree
   * shipped containers come from (`source`, e.g. `dx11`), the backend they are
   * prepared for (`target`, e.g. `webgpu`), and the translator between them.
   *
   * Not Carbon: Carbon loads containers compiled offline for its one platform.
   * A browser translates the shipped containers in memory, and the
   * orchestrator (CjsLibrary's `effects` configuration) says from what, into
   * what and with which format. `DoLoad` then translates a container whose path
   * is in the source tree; the target's own tree (the shader compiler's
   * library, stored overlays) loads as stored; any other tree is read as it is.
   *
   * Once per instance. A resource keeps one container per path, so
   * `effect.dx11/` can only ever hold one translation; committing anything
   * different afterwards throws, and changing it needs a new instance.
   *
   * @param {object} backend The commitment.
   * @param {string} backend.source Effect tree of the shipped containers.
   * @param {string} backend.target Effect tree of the running backend.
   * @param {?{buildEffect: Function}} [backend.translator] Converts a source container into the target's; null when source is target.
   * @param {"onDemand"|"all"} [backend.permutations] Translate the default permutation at load and the rest on first use, or all at load.
   */
  static CommitBackend({ source, target, translator = null, permutations = "onDemand" })
  {
    for (const [ name, value ] of [ [ "source", source ], [ "target", target ] ])
    {
      if (typeof value !== "string" || !/^[a-z0-9_]+$/u.test(value))
      {
        throw new TypeError(`Tr2EffectRes.CommitBackend: ${name} must be an effect tree name, got ${value}.`);
      }
    }
    if (translator !== null && typeof translator.buildEffect !== "function")
    {
      throw new TypeError("Tr2EffectRes.CommitBackend: translator must expose buildEffect.");
    }
    if (translator === null && source !== target)
    {
      throw new TypeError(`Tr2EffectRes.CommitBackend: ${source} containers need a translator into ${target}.`);
    }
    if (permutations !== "onDemand" && permutations !== "all")
    {
      throw new TypeError(`Tr2EffectRes.CommitBackend: permutations must be "onDemand" or "all", got ${permutations}.`);
    }
    if (effectBackend !== null)
    {
      const same = effectBackend.source === source && effectBackend.target === target
        && effectBackend.translator === translator && effectBackend.permutations === permutations;
      if (same) return;
      throw new Error(`Tr2EffectRes.CommitBackend: effects are committed to ${effectBackend.source} -> ${effectBackend.target}; `
        + "a resource holds one container per path, so changing it needs a new instance.");
    }
    effectBackend = { source, target, translator, permutations };
  }

  /**
   * What this instance's effects are prepared for, or null before
   * `CommitBackend`.
   *
   * @returns {?{source: string, target: string, translator: ?object, permutations: string}}
   */
  static GetBackend()
  {
    return effectBackend === null ? null : { ...effectBackend };
  }

  /**
   * Translates a source-tree container into the committed target: every
   * permutation, or the default one plus a translator for the rest, which
   * `_ReaderFor` runs the first time another permutation is asked for.
   *
   * @param {Uint8Array|ArrayBuffer} data The shipped container.
   * @param {object} backend The committed backend.
   * @returns {Uint8Array} The translated container.
   */
  _TranslateOnLoad(data, backend)
  {
    const source = this.GetPath();
    if (backend.permutations === "all")
    {
      return backend.translator.buildEffect(data, { source, mode: "all" }).bytes;
    }
    const translate = permutation => BuiltPermutation(backend.translator.buildEffect(data, { source, permutation }));
    const loaded = translate([]);
    this.SetPermutationTranslator(translate, loaded.indices);
    return loaded.bytes;
  }

  /** Forgets the permutation translator, for a payload that carries every body. */
  _ClearPermutationTranslator()
  {
    this._translatePermutation = null;
    this._translatedIndices = null;
    this._permutationReaders.clear();
  }

  /**
   * The reader holding `index`'s body, translating it first when the loaded
   * container lacks it.
   *
   * @param {number} index Permutation index below the variant count.
   * @returns {CjsCarbonEffectReader}
   */
  _ReaderFor(index)
  {
    if (!this._translatedIndices || this._translatedIndices.has(index))
    {
      return this._permutationReaders.get(index) ?? this._reader;
    }

    const result = this._translatePermutation(this._PermutationOf(index));
    const reader = CjsCarbonEffectFormat.read(result.bytes, { emit: "raw" });

    for (const translated of result.indices)
    {
      if (this._translatedIndices.has(translated)) continue;
      this._translatedIndices.add(translated);
      this._permutationReaders.set(translated, reader);
    }
    if (!this._translatedIndices.has(index))
    {
      throw new Error(`Tr2EffectRes ${this.GetPath()}: translating permutation ${index} produced no body for it`);
    }
    return this._permutationReaders.get(index);
  }

  /**
   * The option values a permutation index selects - `GetShader`'s mixed radix,
   * first axis least significant, run backwards.
   *
   * @cjs
   * @implemented
   * @param {number} index Permutation index.
   * @returns {Array<{name: string, value: string}>}
   */
  _PermutationOf(index)
  {
    const permutation = [];
    let remainder = index;

    for (const axis of getPermutationAxes(this._effectInfo))
    {
      permutation.push({ name: axis.name, value: axis.options[remainder % axis.options.length] });
      remainder = Math.floor(remainder / axis.options.length);
    }
    return permutation;
  }

  /**
   * Return a small JSON-friendly permutation description.
   *
   * @adapted Carbon exposes a Python tuple through Blue; CarbonEngineJS returns a
   *   JSON-friendly plain axis description.
   * @returns {Array<*>}
   */
  GetPermutationDescription()
  {
    const payload = this._effectInfo;
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
   * Carbon ReleaseResources (Tr2EffectRes.cpp:328-341): full storage release
   * clears flags, cancels loading and releases targets' derived shader state.
   *
   * @adapted
   * @param {number} [storage] Native storage mask.
   */
  ReleaseResources(storage = TriStorageFlags.TRISTORAGE_ALL)
  {
    if ((storage & TriStorageFlags.TRISTORAGE_ALL) !== TriStorageFlags.TRISTORAGE_ALL) return;
    this._isGood = this._isPrepared = false;
    this.CancelPendingLoad();
    this._shaders.clear();
    this._NotifyReleaseCachedData();
  }

  /**
   * Explicit JS teardown of retained container and translated permutation readers.
   *
   * @adapted explicit JS teardown replaces native destruction; the existing
   *   MotherLode switches keep CPU data and opaque adapter cleanup independent.
   * @param {object} [options={}] Existing MotherLode cleanup policy.
   * @param {boolean} [options.releasePayload=true] Release owned family data.
   * @param {boolean} [options.destroyAdapters=true] Destroy opaque device adapter slots.
   * @returns {void}
   */
  _OnShutdown(options = {})
  {
    if (options.destroyAdapters !== false) this.DestroyAdapterResources();
    if (options.releasePayload === false) return;
    this._shaders.clear();
    this._reader = null;
    this._permutationReaders.clear();
    this._ClearPermutationTranslator();
    this._carriesBackendBlock = null;
    this._effectInfo = null;
  }

  /**
   * Carbon `IsMemoryUsageKnown` (Tr2EffectRes.cpp:374-377): known once loaded.
   *
   * @implemented
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (Tr2EffectRes.cpp:379-384): the container's bytes.
   *
   * @adapted a browser translates permutations into containers of their own
   *   after the load (`SetPermutationTranslator`), and those bytes are held here
   *   too, so each one held is added once. Like Carbon, this leaves out compiled
   *   shaders and pipelines, which the render context keeps whether or not this
   *   resource lives.
   * @returns {number} Bytes.
   */
  GetMemoryUsage()
  {
    if (!this._reader) return 0;
    let bytes = this._reader.bytes.byteLength;
    for (const reader of new Set(this._permutationReaders.values()))
    {
      bytes += reader.bytes.byteLength;
    }
    return bytes;
  }

  /**
   * Carbon: Tr2EffectRes::DoPrepare (Tr2EffectRes.cpp:316-326), private virtual. Drops
   * every shader built from the previous load so `GetShader` rebuilds them.
   *
   * @adapted Carbon then answers `Tr2Renderer::IsResourceCreationAllowed()`, which is
   *   false while a device reset is under way and so postpones the prepare. That gate
   *   lives in trinity and the resource layer cannot import it; this layer has no
   *   device to reset, so it answers true.
   * @returns {boolean} Always true.
   */
  _DoPrepare()
  {
    this._shaders.clear();
    return true;
  }

  /**
   * Carbon: Tr2EffectRes::OnPrepareResources (Tr2EffectRes.cpp:342-364), the
   * Tr2DeviceResource hook.
   *
   * Not implemented: it is gated on `Tr2Renderer::IsEffectLoadDisabled()` and on the
   * main-thread render context being valid (USE_MAIN_THREAD_RENDER_CONTEXT), then
   * re-`Initialize`s the path and extension of a resource that is neither good nor
   * loading. Tr2EffectRes does not derive from Tr2DeviceResource here and the resource
   * layer cannot reach either gate.
   *
   * @notImplemented
   * @returns {boolean} Never returns.
   */
  _OnPrepareResources()
  {
    throw new Error("Tr2EffectRes._OnPrepareResources requires Tr2Renderer and the main-thread render context, which the resource layer cannot reach.");
  }

  /**
   * Carbon: Tr2EffectRes::GetDescription (Tr2EffectRes.cpp:366-372), compiled under
   * TRINITYDEV. Appends the resource path in the form `Tr2EffectRes: 'path'`.
   *
   * @adapted Carbon fills a `std::string&` output; the description is the return value.
   * @returns {string} The description.
   */
  GetDescription()
  {
    return `Tr2EffectRes: '${this.GetPath()}'`;
  }



  /** Native permutation-axis facts derived from the retained container reader. */
  _effectInfo = null;

  /** Opaque browser device allocations, supplied by Tr2DeviceResource. */
  __adapterResources = null;
}

/**
 * A selected-mode build's container and every permutation index it carries a
 * body for - all the indices that share the translated body.
 *
 * @param {object} built `buildEffect` result.
 * @returns {{bytes: Uint8Array, indices: number[]}}
 */
function BuiltPermutation(built)
{
  const { variants } = built.permutationGraph;
  const bodyKey = variants.find(variant => variant.permutationIndex === built.metadata.bodyIndex)?.bodyKey;

  return {
    bytes: built.bytes,
    indices: variants.filter(variant => variant.bodyKey === bodyKey).map(variant => variant.permutationIndex)
  };
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

CjsSchema.decorateMethod(Tr2EffectRes, "GetPermutationDescription", be.mapMethodAndWrap());
CjsSchema.exposure.mapICacheableMethods()(Tr2EffectRes);
be.define("Tr2EffectRes")(Tr2EffectRes);
be.inherit(ICacheable)(Tr2EffectRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(Tr2EffectRes);
// Carbon: Tr2EffectRes::ExposeToBlue (trinity/trinity/Resources/Tr2EffectRes_Blue.cpp:87).
CjsSchema.blue.chainTo(BlueAsyncRes)(Tr2EffectRes);



be.inherit(Tr2DeviceResource)(Tr2EffectRes, { kind: "class" });


