// Source: E:\carbonengine\trinity\trinity\TriVariable.h
// Source: E:\carbonengine\trinity\trinity\TriVariable.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { TriVariableContentType } from "../generated/trinityCore/enums.js";


/**
 * One named shader-binding variable: the content type fixed when it was
 * registered, plus the value payload standing in for Carbon's typed union.
 */
@type.define({
  className: "TriVariable",
  family: "trinityCore"
})
export class TriVariable extends CjsModel
{
  @io.read
  @type.string
  name = "";

  /** m_type (TriVariableContentType). */
  @io.read
  @type.int32
  contentType = TriVariableContentType.TRIVARIABLE_INVALID;

  /** Runtime value payload; the typed C++ union collapses to one slot. */
  value = null;

  /** The registered variable name, which the store also uses as its key. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** The TriVariableContentType fixed at registration; SetValue never changes it. */
  @carbon.method
  @impl.implemented
  GetType()
  {
    return this.contentType;
  }

  /**
   * Assigns the value payload. The content type stays as registered; Carbon
   * fixes it at registration time and SetValue only stores.
   */
  @carbon.method
  @impl.adapted
  SetValue(value)
  {
    this.value = value;
    return true;
  }

  /**
   * Reads the payload; when out is array-like and so is the payload, the
   * overlapping components are copied into out and out is returned, otherwise
   * the stored payload itself is returned and is not a copy.
   */
  @carbon.method
  @impl.adapted
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
   */
  @carbon.method
  @impl.implemented
  Invalidate()
  {
    this.value = null;
    this.contentType = TriVariableContentType.TRIVARIABLE_INVALID;
  }

  /**
   * Clears the value but leaves the type alone, so a new SetValue will
   * still work. Carbon zeroes the union slot and drops texture/buffer
   * references; the JS payload slot zero-fills arrays and nulls references.
   */
  @carbon.method
  @impl.adapted
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
   * Carbon's display name for a content type, defaulting to this variable's own
   * type.
   */
  @carbon.method
  @impl.implemented
  GetTypeName(contentType = this.contentType)
  {
    return TriVariable.GetTypeName(contentType);
  }

  /**
   * Constant-buffer byte size of a content type, defaulting to this variable's
   * own type.
   */
  @carbon.method
  @impl.implemented
  GetTypeSize(contentType = this.contentType)
  {
    return TriVariable.GetTypeSize(contentType);
  }

  /**
   * Maps a script value onto a Carbon content type the way the Python
   * bridge does: integers and booleans register as INT (Python bools are
   * ints), other numbers as FLOAT, arrays by length, texture-provider
   * shapes as TEXTURE_RES. Unknown values map to INVALID, which
   * RegisterVariable treats as unsupported (GPU-buffer duck detection has
   * no reliable JS shape yet and is left to the realization layer).
   */
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
    }
    return TriVariableContentType.TRIVARIABLE_INVALID;
  }

  /**
   * Carbon's display name for a content type; an unrecognised type falls back to
   * the INVALID label.
   */
  static GetTypeName(contentType)
  {
    return TriVariable.#typeNames[contentType] ?? TriVariable.#typeNames[0];
  }

  /**
   * Byte size a variable of the given content type occupies in a constant
   * buffer. INVALID and UNKNOWN_FLOAT may be converted to another type, so
   * they must register as the largest type. Texture and GPU-buffer slots are
   * pointer-sized in Carbon; the JS reference slot keeps the same 8 bytes so
   * shared-buffer offset math stays aligned with Carbon's.
   */
  static GetTypeSize(contentType)
  {
    return TriVariable.#typeSizes[contentType] ?? 0;
  }

  static #typeNames = Object.freeze([
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
  ]);

  static #typeSizes = Object.freeze([
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
  ]);

  static ContentType = TriVariableContentType;
}
