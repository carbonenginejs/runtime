// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\TriFloatArrayParameter.h
// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\TriFloatArrayParameter.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsParameter } from "./CjsParameter.js";


/** An ordered list of vec4 rows uploaded into one named shader constant array. */
@type.define({
  className: "TriFloatArrayParameter",
  family: "shader"
})
export class TriFloatArrayParameter extends CjsParameter
{
  @io.notify
  @io.persist
  @type.list("TriVector4")
  value = [];

  @io.read
  @type.boolean
  usedByCurrentTechnique = false;

  @io.read
  @type.boolean
  usedByCurrentEffect = false;

  @io.notify
  @io.persist
  @type.string
  name = "";

  #cachedEffect = null;

  /** The shader constant-array name these rows bind to. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: each row's vec4 bytes, then name. */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    for (const row of this.value)
    {
      startingHash = CjsParameter.hashFnv1Floats(row?.data ?? [0, 0, 0, 0], startingHash);
    }
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /** Nothing to resolve - the rows are authored data; returns true. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Re-resolves effect handles against the cached shader after any notified
   * field changes.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.RebuildEffectHandles(this.#cachedEffect);
    return true;
  }

  /**
   * Caches the shader and records whether it reflects a constant of this name;
   * no GPU handle is bound.
   */
  @carbon.method
  @impl.adapted
  RebuildEffectHandles(effectRes)
  {
    this.#cachedEffect = effectRes;
    const used = !!this.name && CjsParameter.hasEffectConstant(effectRes, this.name);
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
  }

  /**
   * Packs the rows contiguously into the destination, stopping at whichever limit comes first: the last row, the destination length, or the byte budget; a final row may be written partially.
   * @param size byte budget in the destination, four bytes per float
   */
  @carbon.method
  @impl.adapted
  CopyValueToEffect(_inputType, out, size = Number.POSITIVE_INFINITY)
  {
    const byteLimit = Number.isFinite(size) ? Math.max(0, size) : Infinity;
    const floatLimit = Math.min(Number(out.length), Math.floor(byteLimit / 4));
    let offset = 0;
    for (const entry of this.value)
    {
      if (offset >= floatLimit)
      {
        break;
      }
      const count = Math.min(4, floatLimit - offset);
      TriFloatArrayParameter.copyVector4ToDestination(out, entry.data, offset, count);
      offset += count;
    }
  }

  /**
   * Copies `count` components of one row into `out` starting at `offset`,
   * allowing a truncated tail row.
   */
  static copyVector4ToDestination(out, value, offset, count)
  {
    for (let i = 0; i < count; i++)
    {
      out[offset + i] = value[i];
    }
  }

}
