// Source: trinity/trinity/TriVariable.h
// Source: trinity/trinity/TriVariable.cpp
import { meta, type, blue } from "#schema";
import { Tr2ColorSpace } from "#consts/render-context";
import { ITr2EffectValue, ResourceFlags } from "../../shader/parameter/ITr2EffectValue.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";
import { RealizeTexture } from "../Tr2ImageIOHelpers.js";
import { float32FromBits } from "#utils/bytes";


/**
 * One named shader-binding variable: the content type fixed when it was
 * registered, plus the value payload standing in for Carbon's typed union.
 * Carbon uses BLUE_DEFINE_NONEXPOSED; the existing JavaScript catalog keeps
 * construction available to the variable store and direct consumers.
 */
@blue.define("TriVariable")
export class TriVariable extends ITr2EffectValue
{
  /** Existing JavaScript name inspection declaration; not a native Blue member. */
  @blue.read
  @type.string
  name = "";

  /** Existing JavaScript type inspection declaration; native TriVariable exposes no members. */
  @blue.read
  @type.int32
  contentType = TriVariableContentType.TRIVARIABLE_INVALID;

  /**
   * Runtime value payload; the typed C++ union collapses to one slot.
   * Held gap: a texture/buffer provider in this mixed scalar/array/reference
   * slot is not discovered by declared resource traversal. The existing
   * single-slot adapter is retained without adding duplicate resource storage.
   */
  value = null;

  /**
   * The registered variable name, which the store also uses as its key.
   * @returns {string} Variable result.
   */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * The TriVariableContentType fixed at registration; SetValue never changes it.
   * @returns {number} Variable result.
   */
  @blue.method
  @meta.implemented
  GetType()
  {
    return this.contentType;
  }

  /**
   * Stores the value. The content type stays as registered; Carbon fixes it at
   * registration time and SetValue only stores.
   *
   * A vector or matrix is COPIED into this variable's own storage, as Carbon's
   * `*(T*)m_value = value` copies into `m_value` (TriVariable.h:148, :176): a
   * caller that later reuses its array does not change the variable. Scalars
   * are stored as they are; texture and buffer providers are held by
   * reference, as Carbon holds their smart pointers.
   * Adapted: Preserves the single JavaScript payload slot instead of the native typed union and returns success to existing callers.
   * @param {*} value Portable value payload.
   * @returns {boolean} Variable result.
   */
  @blue.method
  @meta.adapted
  SetValue(value)
  {
    const length = TriVariable._componentCounts[this.contentType];
    if (!length || !value || typeof value.length !== "number")
    {
      this.value = value;
      return true;
    }

    let storage = this.value;
    if (!(storage instanceof Float32Array) || storage.length !== length)
    {
      storage = this.value = new Float32Array(length); // alloc: the variable's own storage, Carbon's m_value
    }
    const count = Math.min(length, value.length);
    for (let index = 0; index < count; index++) storage[index] = value[index];
    return true;
  }

  /**
   * Reads the value. A vector or matrix is COPIED into `out`, as Carbon's
   * `value = *(T*)m_value` copies into the caller's variable (TriVariable.h:129);
   * without an `out` a new array of the type's size is returned, as the
   * Tr2Vector*Parameter GetValue(out = vecN.create()) methods do. The stored
   * array itself is never handed out. Scalars and providers return as stored.
   * Adapted: Adapts native typed output arguments to an optional array output or a direct JavaScript value return.
   * @param {ArrayLike|undefined} [out] Optional destination for array components.
   * @returns {*} Variable result.
   */
  @blue.method
  @meta.adapted
  GetValue(out = undefined)
  {
    const value = this.value;
    if (!value || typeof value.length !== "number") return value;
    if (!out)
    {
      const length = TriVariable._componentCounts[this.contentType];
      if (!length) return value;
      out = new Float32Array(length); // alloc: returned copy when the caller supplies no out
    }
    const count = Math.min(out.length, value.length);
    for (let index = 0; index < count; index++) out[index] = value[index];
    return out;
  }

  /**
   * Clears the payload and returns the variable to the reserved INVALID
   * type, releasing texture/buffer references as Carbon's Clear does.
   * Adapted: Releases the single JavaScript payload and invalidates its type; native Clear separately releases resource fields and clears union storage.
   * @returns {void} No return value.
   */
  @blue.method
  @meta.adapted
  Invalidate()
  {
    this.value = null;
    this.contentType = TriVariableContentType.TRIVARIABLE_INVALID;
  }

  /**
   * Clears the value but leaves the type alone, so a new SetValue will
   * still work. Carbon zeroes the union slot and drops texture/buffer
   * references; the JS payload slot zero-fills arrays and nulls references.
   * Adapted: Preserves the portable array/scalar/reference clearing rules instead of zeroing the native union and separate resource pointers.
   * @returns {void} No return value.
   */
  @blue.method
  @meta.adapted
  Clear()
  {
    const value = this.value;
    if (value && typeof value.length === "number" && typeof value.fill === "function")
    {
      value.fill(0);
    }
    else if (typeof value === "number")
    {
      this.value = 0;
    }
    else
    {
      this.value = null;
    }
  }

  /**
   * Binds this variable's resource into a resource-set description.
   *
   * Carbon `TriVariable::CopyToResourceSet` (`TriVariable.cpp:25-67`), which
   * switches on the content type and answers false for everything that is not
   * a resource — a float or a matrix is a CONSTANT and reaches a shader
   * through `CopyValueToEffect`, not through a resource set.
   *
   * A PROVIDER THAT HAS NOT RESOLVED STILL BINDS, as an empty slot rather than
   * a skipped one. That is Carbon's, and it matters: leaving the register
   * untouched would let a draw read whatever the previous one bound there.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {number} [flags] A `ResourceFlags` word; bit 0 is sRGB.
   * @param {object} [renderContext] The binding context, an ADDED argument as
   *   on TriTextureParameter: a texture resource here creates its texture at
   *   first bind (Carbon creates it in DoPrepare), so a provider that has
   *   resolved but not yet realized is realized through the context.
   * @returns {boolean} Whether the slot took the binding.
   * Adapted: Retains the existing JavaScript provider representation and optional texture realization context, with direct resource-set calls.
   */
  @blue.method
  @meta.adapted
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0, renderContext = null)
  {
    if (this.contentType === TriVariableContentType.TRIVARIABLE_TEXTURE_RES)
    {
      const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
        ? Tr2ColorSpace.COLOR_SPACE_SRGB
        : Tr2ColorSpace.COLOR_SPACE_LINEAR;

      return resourceDesc.SetSrv__TextureAL(stage, registerIndex, this._Texture(renderContext), colorSpace);
    }

    if (this.contentType === TriVariableContentType.TRIVARIABLE_GPUBUFFER)
    {
      return resourceDesc.SetSrv__BufferAL(stage, registerIndex, this._GpuBuffer());
    }

    return false;
  }

  /**
   * Binds this variable's resource as an unordered-access view.
   *
   * Carbon `TriVariable::ApplyUav` (`TriVariable.cpp:69+`). Same switch, no
   * colour space — a UAV is written rather than sampled.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @returns {boolean} Whether the slot took the binding.
   * Adapted: Retains the existing JavaScript provider representation when selecting a texture or GPU buffer.
   */
  @blue.method
  @meta.adapted
  ApplyUav(resourceDesc, stage, registerIndex)
  {
    if (this.contentType === TriVariableContentType.TRIVARIABLE_TEXTURE_RES)
    {
      return resourceDesc.SetUav__TextureAL(stage, registerIndex, this._Texture());
    }

    if (this.contentType === TriVariableContentType.TRIVARIABLE_GPUBUFFER)
    {
      return resourceDesc.SetUav__BufferAL(stage, registerIndex, this._GpuBuffer());
    }

    return false;
  }

  /**
   * The provider's texture, realized through the context if it has resolved but not yet been created; null otherwise.
   * Custom: preserves the existing JavaScript provider admission and realization adapter.
   * @param {object|null} [renderContext] Optional texture realization context.
   * @returns {object|null} Variable result.
   */
  _Texture(renderContext = null)
  {
    const provider = this.value;

    if (typeof provider?.GetTexture !== "function") return null;

    const texture = provider.GetTexture();

    if (texture || !renderContext || typeof provider.IsPrepared !== "function") return texture;

    return RealizeTexture(provider, renderContext);
  }

  /**
   * The provider's first buffer, which is the index Carbon passes.
   * Custom: preserves the existing JavaScript provider admission and realization adapter.
   * @returns {object|null} Variable result.
   */
  _GpuBuffer()
  {
    const provider = this.value;

    return typeof provider?.GetGpuBuffer === "function" ? provider.GetGpuBuffer(0) : null;
  }

  /**
   * Carbon's GetTypeName() const (TriVariable.h:193): this variable's type
   * name. The static ( t ) form is TriVariable.getTypeName.
   * @returns {string}
   */
  @blue.method
  @meta.implemented
  GetTypeName()
  {
    return TriVariable.getTypeName(this.contentType);
  }

  /**
   * Carbon's GetTypeSize() const (TriVariable.h:198): this variable's
   * constant-buffer byte size. The static ( t ) form is TriVariable.getTypeSize.
   * @returns {number}
   */
  @blue.method
  @meta.implemented
  GetTypeSize()
  {
    return TriVariable.getTypeSize(this.contentType);
  }

  /**
   * Native constant-buffer value size.
   * @returns {number} Byte size for this variable's registered type.
   */
  @blue.method
  @meta.implemented
  GetValueSize()
  {
    return this.GetTypeSize();
  }

  /**
   * Maps a script value onto a Carbon content type the way the Python
   * bridge does: integers and booleans register as INT (Python bools are
   * ints), other numbers as FLOAT, arrays by length, texture-provider
   * shapes as TEXTURE_RES. Unknown values map to INVALID, which
   * RegisterVariable treats as unsupported; the existing GPU-buffer adapter
   * recognizes providers exposing GetGpuBuffer.
   * Adapted: Classifies portable JavaScript payloads for the script registration bridge instead of using native C++ type overloads.
   * @param {*} value Portable value payload.
   * @returns {number} Variable result.
   */
  @meta.adapted
  static getVariableType(value)
  {
    if (typeof value === "boolean")
    {
      return TriVariableContentType.TRIVARIABLE_INT;
    }
    if (typeof value === "number")
    {
      return Number.isInteger(value)
        ? TriVariableContentType.TRIVARIABLE_INT
        : TriVariableContentType.TRIVARIABLE_FLOAT;
    }
    if (value && typeof value.length === "number")
    {
      switch (value.length)
      {
        case 2: return TriVariableContentType.TRIVARIABLE_FLOAT2;
        case 3: return TriVariableContentType.TRIVARIABLE_FLOAT3;
        case 4: return TriVariableContentType.TRIVARIABLE_FLOAT4;
        case 16: return TriVariableContentType.TRIVARIABLE_FLOAT4X4;
      }
      return TriVariableContentType.TRIVARIABLE_INVALID;
    }
    if (value && typeof value === "object")
    {
      if (typeof value.GetTexture === "function" || typeof value.RequestResolution === "function")
      {
        return TriVariableContentType.TRIVARIABLE_TEXTURE_RES;
      }
      // Carbon GetVariableType( const ITr2GpuBuffer* ) (TriVariable.h:33): a
      // ring buffer registered as BoneTransforms (EveSpaceScene.cpp:257).
      if (typeof value.GetGpuBuffer === "function")
      {
        return TriVariableContentType.TRIVARIABLE_GPUBUFFER;
      }
    }
    return TriVariableContentType.TRIVARIABLE_INVALID;
  }

  /**
   * Copies the value into an effect constant destination.
   *
   * Clamped to the destination length, the source length, and `size` BYTES at
   * four bytes per float - `size` is a byte budget, not a component count. A
   * scalar writes one component.
   *
   * Lives here because an effect binds a VARIABLE and then copies from it, so
   * the variable has to be able to answer. It used to live only on a parallel
   * store's own variable class, which is why binding could not use Carbon's.
   *
   * @param {*} _inputType Accepted and ignored, matching the parameter shape.
   * @param {ArrayLike} destination Constant destination.
   * @param {number} [size] Byte budget in the destination.
   * @returns {boolean} Whether anything was written.
   * Adapted: Copies JavaScript scalar/array storage into a bounded constant destination, transposing matrices for shaders and returning whether data was written.
   */
  @blue.method
  @meta.adapted
  CopyValueToEffect(_inputType, destination, size = Number.POSITIVE_INFINITY)
  {
    if (!destination || typeof destination.length !== "number") return false;

    // Reads the storage directly, as Carbon's CopyValueToEffect reads m_value.
    const source = this.value;

    if (typeof source === "number")
    {
      // An INT is memcpy'd (TriVariable.cpp:136-139): the shader reads its BITS
      // (asuint), so the float mirror takes the integer's bit pattern, not its value.
      // The picking pointer's low/high words (Tr2RenderContext.cpp:921-933) travel this way.
      destination[0] = this.contentType === TriVariableContentType.TRIVARIABLE_INT ? float32FromBits(source) : source;
      return true;
    }

    if (!source || typeof source.length !== "number") return false;

    const byteLimit = Number.isFinite(size) ? Math.max(0, size) : Infinity;
    const count = Math.min(destination.length, source.length, Math.floor(byteLimit / 4));

    // A MATRIX IS TRANSPOSED on the way in: "column_major for shaders"
    // (TriVariable.cpp:127-133, TriMatrixTranspose clamped to the register
    // size). Copied straight, every matrix a shader bound through the global
    // store - ViewMat, ProjectionMat, ViewProjectionMat - arrived flipped.
    if (this.contentType === TriVariableContentType.TRIVARIABLE_FLOAT4X4)
    {
      for (let i = 0; i < count; i++) destination[i] = source[(i % 4) * 4 + Math.floor(i / 4)];
      return count > 0;
    }

    for (let i = 0; i < count; i++) destination[i] = source[i];

    return count > 0;
  }

  /**
   * Carbon's display name for a content type; an unrecognised type falls back to
   * the INVALID label.
   * Adapted: Uses the existing JavaScript lookup table and preserves its INVALID fallback for an unknown index.
   * @param {number} contentType Native content-type value.
   * @returns {string} Variable result.
   */
  @meta.adapted
  static getTypeName(contentType)
  {
    return TriVariable._typeNames[contentType] ?? TriVariable._typeNames[0];
  }

  /**
   * Byte size a variable of the given content type occupies in a constant
   * buffer. INVALID and UNKNOWN_FLOAT may be converted to another type, so
   * they must register as the largest type. Texture and GPU-buffer slots are
   * pointer-sized in Carbon; the JS reference slot keeps the same 8 bytes so
   * shared-buffer offset math stays aligned with Carbon's.
   * Adapted: Uses the existing JavaScript size table, including eight-byte reference slots and the zero fallback for an unknown index.
   * @param {number} contentType Native content-type value.
   * @returns {number} Variable result.
   */
  @meta.adapted
  static getTypeSize(contentType)
  {
    return TriVariable._typeSizes[contentType] ?? 0;
  }

  /** Native content-type table exposed through the existing JavaScript adapter. */
  static _typeNames = [
    "INVALID TYPE!",
    "TRIVARIABLE_UNKNOWN_FLOAT",
    "TRIVARIABLE_TEXTURE_RES",
    "TRIVARIABLE_INT",
    "TRIVARIABLE_FLOAT",
    "TRIVARIABLE_FLOAT2",
    "TRIVARIABLE_FLOAT3",
    "TRIVARIABLE_FLOAT4",
    "TRIVARIABLE_FLOAT4X4",
    "TRIVARIABLE_COLOR",
    "TRIVARIABLE_GPUBUFFER"
  ];

  /** Native content-type table exposed through the existing JavaScript adapter. */
  static _typeSizes = [
    4 * 16,
    4 * 16,
    8,
    4,
    4,
    4 * 2,
    4 * 3,
    4 * 4,
    4 * 16,
    4 * 4,
    8
  ];

  /** Float components of the vector and matrix content types, which are stored by copy. */
  static _componentCounts = {
    [TriVariableContentType.TRIVARIABLE_FLOAT2]: 2,
    [TriVariableContentType.TRIVARIABLE_FLOAT3]: 3,
    [TriVariableContentType.TRIVARIABLE_FLOAT4]: 4,
    [TriVariableContentType.TRIVARIABLE_COLOR]: 4,
    [TriVariableContentType.TRIVARIABLE_FLOAT4X4]: 16
  };

  /** Native content-type table exposed through the existing JavaScript adapter. */
  static ContentType = TriVariableContentType;
}

// Native nonexposed table has only concrete/IRoot identity; ITr2EffectValue is nominal only.
blue.interface()(TriVariable);
