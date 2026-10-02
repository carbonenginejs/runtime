// Source: trinity/trinity/TriVariable.h
// Source: trinity/trinity/TriVariable.cpp
import { meta } from "#schema";
import { Tr2ColorSpace } from "#consts/render-context";
import { ITr2EffectValue, ResourceFlags } from "../../shader/parameter/ITr2EffectValue.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";
import { RealizeTexture } from "../Tr2ImageIOHelpers.js";


/**
 * One named shader-binding variable: the content type fixed when it was
 * registered, plus the value payload standing in for Carbon's typed union.
 * Carbon uses BLUE_DEFINE_NONEXPOSED; the existing JavaScript catalog keeps
 * construction available to the variable store and direct consumers.
 */
@meta.define({
  className: "TriVariable",
  family: "trinityCore"
})
export class TriVariable extends ITr2EffectValue
{
  /** Existing JavaScript name inspection declaration; not a native Blue member. */
  @meta.blue.read
  @meta.type.string
  name = "";

  /** Existing JavaScript type inspection declaration; native TriVariable exposes no members. */
  @meta.blue.read
  @meta.type.int32
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
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * The TriVariableContentType fixed at registration; SetValue never changes it.
   * @returns {number} Variable result.
   */
  @meta.blue.method
  @meta.implemented
  GetType()
  {
    return this.contentType;
  }

  /**
   * Assigns the value payload. The content type stays as registered; Carbon
   * fixes it at registration time and SetValue only stores.
   * Adapted: Preserves the single JavaScript payload slot instead of the native typed union and returns success to existing callers.
   * @param {*} value Portable value payload.
   * @returns {boolean} Variable result.
   */
  @meta.blue.method
  @meta.adapted
  SetValue(value)
  {
    this.value = value;
    return true;
  }

  /**
   * Reads the payload; when out is array-like and so is the payload, the
   * overlapping components are copied into out and out is returned, otherwise
   * the stored payload itself is returned and is not a copy.
   * Adapted: Adapts native typed output arguments to an optional array output or a direct JavaScript value return.
   * @param {ArrayLike|undefined} [out] Optional destination for array components.
   * @returns {*} Variable result.
   */
  @meta.blue.method
  @meta.adapted
  GetValue(out = undefined)
  {
    const value = this.value;
    if (out && value && typeof value.length === "number" && typeof out.length === "number")
    {
      const count = Math.min(out.length, value.length);
      for (let index = 0; index < count; index++)
      {
        out[index] = value[index];
      }
      return out;
    }
    return value;
  }

  /**
   * Clears the payload and returns the variable to the reserved INVALID
   * type, releasing texture/buffer references as Carbon's Clear does.
   * Adapted: Releases the single JavaScript payload and invalidates its type; native Clear separately releases resource fields and clears union storage.
   * @returns {void} No return value.
   */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0, renderContext = null)
  {
    if (this.contentType === TriVariableContentType.TRIVARIABLE_TEXTURE_RES)
    {
      const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
        ? Tr2ColorSpace.COLOR_SPACE_SRGB
        : Tr2ColorSpace.COLOR_SPACE_LINEAR;

      return resourceDesc.SetSrv(stage, registerIndex, this._Texture(renderContext), colorSpace);
    }

    if (this.contentType === TriVariableContentType.TRIVARIABLE_GPUBUFFER)
    {
      return resourceDesc.SetSrv(stage, registerIndex, this._GpuBuffer(), 0, 1);
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
  @meta.blue.method
  @meta.adapted
  ApplyUav(resourceDesc, stage, registerIndex)
  {
    if (this.contentType === TriVariableContentType.TRIVARIABLE_TEXTURE_RES)
    {
      return resourceDesc.SetUav(stage, registerIndex, this._Texture());
    }

    if (this.contentType === TriVariableContentType.TRIVARIABLE_GPUBUFFER)
    {
      return resourceDesc.SetUav(stage, registerIndex, this._GpuBuffer(), 0, 1);
    }

    return false;
  }

  /**
   * The provider's texture, realized through the context if it has resolved but not yet been created; null otherwise.
   * Custom: preserves the existing JavaScript provider admission and realization adapter.
   * @param {object|null} [renderContext] Optional texture realization context.
   * @returns {object|null} Variable result.
   */
  @meta.ours
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
  @meta.ours
  _GpuBuffer()
  {
    const provider = this.value;

    return typeof provider?.GetGpuBuffer === "function" ? provider.GetGpuBuffer(0) : null;
  }

  /**
   * Carbon's display name for a content type, defaulting to this variable's own
   * type.
   * @param {number} [contentType] Native content-type value.
   * @returns {string} Variable result.
   */
  @meta.blue.method
  @meta.implemented
  GetTypeName(contentType = this.contentType)
  {
    return TriVariable.getTypeName(contentType);
  }

  /**
   * Constant-buffer byte size of a content type, defaulting to this variable's
   * own type.
   * @param {number} [contentType] Native content-type value.
   * @returns {number} Variable result.
   */
  @meta.blue.method
  @meta.implemented
  GetTypeSize(contentType = this.contentType)
  {
    return TriVariable.getTypeSize(contentType);
  }

  /**
   * Native constant-buffer value size.
   * @returns {number} Byte size for this variable's registered type.
   */
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  CopyValueToEffect(_inputType, destination, size = Number.POSITIVE_INFINITY)
  {
    if (!destination || typeof destination.length !== "number") return false;

    const source = this.GetValue();

    if (typeof source === "number")
    {
      destination[0] = source;
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

  /** Native content-type table exposed through the existing JavaScript adapter. */
  static ContentType = TriVariableContentType;
}

// Native nonexposed table has only concrete/IRoot identity; ITr2EffectValue is nominal only.
meta.blue.interfaceTable({ interfaces: [TriVariable], chainTo: null })(TriVariable, { kind: "class" });
