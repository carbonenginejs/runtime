import { CjsModel } from "#model";


/**
 * Shared base for the shader parameter models: destination-reroute plumbing,
 * effect-reflection lookups and Carbon's FNV1 content hashing.
 */
export class CjsParameter extends CjsModel
{

  /**
   * Whether a value can receive a scalar write - a setter function, a `{ value:
   * number }` holder, or a writable number array.
   */
  static isScalarDestination(value)
  {
    return typeof value === "function" || CjsParameter.isNumberHolder(value) || CjsParameter.isWritableNumberArray(value, 1);
  }

  /**
   * Reads a scalar back out of whichever destination form was supplied.
   * @param fallback returned for function destinations, which are write-only
   */
  static readScalarDestination(destination, fallback)
  {
    if (typeof destination === "function")
    {
      return fallback;
    }
    if (CjsParameter.isNumberHolder(destination))
    {
      return Number(destination.value);
    }
    return Number(destination[0]);
  }

  /**
   * Writes a scalar through whichever destination form was supplied - calling a
   * function, assigning `.value`, or writing element 0.
   */
  static writeScalarDestination(destination, value)
  {
    if (typeof destination === "function")
    {
      destination(value);
      return;
    }
    if (CjsParameter.isNumberHolder(destination))
    {
      destination.value = value;
      return;
    }
    destination[0] = value;
  }

  /**
   * Tells every registered binding the parameter's destination moved, calling
   * function bindings directly and object bindings through RerouteDestination.
   */
  static notifyBindings(bindings, destination)
  {
    for (const binding of bindings)
    {
      if (typeof binding === "function")
      {
        binding(destination);
      }
      else
      {
        binding.RerouteDestination?.(destination);
      }
    }
  }

  /**
   * Appends a binding to a parameter's binding list unless it is already
   * present.
   */
  static registerBinding(bindings, binding)
  {
    if (!bindings.includes(binding))
    {
      bindings.push(binding);
    }
  }

  /**
   * Removes a binding from a parameter's binding list; unknown bindings are
   * ignored.
   */
  static unregisterBinding(bindings, binding)
  {
    const index = bindings.indexOf(binding);
    if (index >= 0)
    {
      bindings.splice(index, 1);
    }
  }

  /** Whether the shader reflects a constant of this name. */
  static hasEffectConstant(effectRes, name)
  {
    return !!CjsParameter.getEffectConstant(effectRes, name);
  }

  /**
   * The reflected constant description for a name, accepting either casing of
   * the accessor; null when absent. Reflection metadata only - never a GPU
   * handle.
   */
  static getEffectConstant(effectRes, name)
  {
    const reader = effectRes;
    return reader?.GetConstant?.(name) ?? reader?.getConstant?.(name) ?? null;
  }

  /** Whether the shader reflects a resource of this name. */
  static hasEffectResource(effectRes, name)
  {
    const reader = effectRes;
    return !!(reader?.GetResource?.(name) ?? reader?.getResource?.(name));
  }

  /**
   * The reflected resource description for a name, accepting either casing of
   * the accessor; null when absent.
   */
  static getEffectResource(effectRes, name)
  {
    const reader = effectRes;
    return reader?.GetResource?.(name) ?? reader?.getResource?.(name) ?? null;
  }

  /**
   * The annotation container the shader authored for a parameter name, in
   * whatever shape the reflection source uses; null when absent.
   */
  static getEffectAnnotations(effectRes, name)
  {
    const reader = effectRes;
    return reader?.GetParameterAnnotations?.(name) ?? reader?.getParameterAnnotations?.(name) ?? null;
  }

  /**
   * A parameter's shader name, preferring GetParameterName over a raw `name`
   * field; the empty string when neither exists.
   */
  static getNamedValue(value)
  {
    return value?.GetParameterName?.() ?? value?.getParameterName?.() ?? value?.name ?? "";
  }

  /**
   * The name of a collection entry that may be a bare string, a named model, or
   * a `{ key }` pair.
   */
  static getArrayItemName(value)
  {
    return typeof value === "string" ? value : value?.name ?? value?.key ?? "";
  }

  /**
   * First array entry whose item name or parameter name matches; null for a
   * non-array.
   */
  static findByName(values, name)
  {
    return Array.isArray(values) ? values.find(value => CjsParameter.getArrayItemName(value) === name || CjsParameter.getNamedValue(value) === name) ?? null : null;
  }

  /**
   * Invalidates a material's resource sets and constant buffers after one of its
   * resources changed; every call is optional-chained, so non-material owners
   * are tolerated.
   */
  static markMaterialResourcesDirty(material)
  {
    material?.InvalidateResourceSets?.();
    material?.ResourceChanged?.();
    material?.MarkConstantBuffersDirty?.();
  }

  /**
   * Reads the sRGB flag off a reflected constant, accepting the
   * isSRGB/isSrgb/srgb spellings different reflection sources emit.
   */
  static getConstantIsSrgb(constant)
  {
    const data = constant;
    return !!(data?.isSRGB ?? data?.isSrgb ?? data?.srgb);
  }

  // --- Content hashing (Carbon CcpHashFNV1) -------------------------------
  // Carbon hashes interned name POINTERS and value struct bytes; JS hashes
  // the name characters and float32 value bytes instead. The dedup contract
  // (equal content -> equal hash within a session) is preserved; the numeric
  // hashes intentionally differ from Carbon's, which are address-dependent.

  static FNV1_INITIAL = 2166136261;

  /** FNV1 over a string's UTF-16 code units, two bytes each, little-endian. */
  static hashFnv1String(text, hash = CjsParameter.FNV1_INITIAL)
  {
    const value = String(text ?? "");
    for (let index = 0; index < value.length; index++)
    {
      const code = value.charCodeAt(index);
      hash = (Math.imul(hash, 16777619) ^ (code & 0xff)) >>> 0;
      hash = (Math.imul(hash, 16777619) ^ (code >>> 8)) >>> 0;
    }
    return hash >>> 0;
  }

  /** FNV1 over numbers encoded as little-endian float32 bytes. */
  static hashFnv1Floats(values, hash = CjsParameter.FNV1_INITIAL)
  {
    const view = CjsParameter.#hashScratch;
    for (const value of values)
    {
      view.setFloat32(0, Number(value) || 0, true);
      for (let byte = 0; byte < 4; byte++)
      {
        hash = (Math.imul(hash, 16777619) ^ view.getUint8(byte)) >>> 0;
      }
    }
    return hash >>> 0;
  }

  /**
   * FNV1 over a stable per-object identity - the JS stand-in for Carbon
   * hashing a smart-pointer address. Null hashes as identity 0.
   */
  static hashFnv1Identity(object, hash = CjsParameter.FNV1_INITIAL)
  {
    let id = 0;
    if (object !== null && object !== undefined)
    {
      id = CjsParameter.#identities.get(object);
      if (id === undefined)
      {
        id = CjsParameter.#nextIdentity++;
        CjsParameter.#identities.set(object, id);
      }
    }
    const view = CjsParameter.#hashScratch;
    view.setUint32(0, id >>> 0, true);
    for (let byte = 0; byte < 4; byte++)
    {
      hash = (Math.imul(hash, 16777619) ^ view.getUint8(byte)) >>> 0;
    }
    return hash >>> 0;
  }

  static #hashScratch = new DataView(new ArrayBuffer(4));

  static #identities = new WeakMap();

  static #nextIdentity = 1;

  /**
   * Whether a value is an object with a numeric `value` property - the
   * boxed-scalar destination form.
   */
  static isNumberHolder(value)
  {
    return typeof value === "object" && value !== null && "value" in value && typeof value.value === "number";
  }

  /**
   * Whether a value is an object with a `length` of at least `length`; element
   * types are deliberately not checked, so uninitialized out-parameters pass.
   */
  static isWritableNumberArray(value, length)
  {
    return !!value && typeof value === "object" && "length" in value && Number(value.length) >= length;
  }

  /**
   * Whether a value is an array or typed array of exactly `length` numbers - the
   * strict test used to infer a parameter class from a raw map-form value.
   */
  static isNumberArrayValue(value, length)
  {
    if (!value || typeof value !== "object" || Number(value.length) !== length) return false;
    if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return false;
    for (let index = 0; index < length; index++)
    {
      if (typeof value[index] !== "number") return false;
    }
    return true;
  }

}
