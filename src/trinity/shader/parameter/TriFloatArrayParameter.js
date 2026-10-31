import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.h
// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.cpp
import { IInitialize } from "#blue";
import { INotify } from "#blue";
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { meta, type, blue } from "#schema";
import { FNV1_INITIAL, hashFnv1Floats, hashFnv1String } from "#utils/hash";


/** An ordered list of vec4 rows uploaded into one named shader constant array. */
@be.define("TriFloatArrayParameter")
@be.inherit(INotify, IInitialize)
@be.mapInterface(ITriEffectParameter)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class TriFloatArrayParameter extends ITriEffectParameter
{
  @be.mapAttribute(be.READ | be.NOTIFY | be.PERSIST)


  @type.list("TriVector4")
  value = [];

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentTechnique = false;

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentEffect = false;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  #cachedEffect = null;

  /**
   * The shader constant-array name these rows bind to.
   *
   * @implemented
   */

  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /**
   * Content hash: each row's vec4 bytes, then name.
   *
   * @adapted
   */

  @meta.adapted
  GetHashValue(startingHash = FNV1_INITIAL)
  {
    for (const row of this.value)
    {
      startingHash = hashFnv1Floats(row?.data ?? [0, 0, 0, 0], startingHash);
    }
    return hashFnv1String(this.name, startingHash);
  }

  /**
   * Nothing to resolve - the rows are authored data; returns true.
   *
   * @implemented
   */

  @meta.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Re-resolves effect handles against the cached shader after any notified
   * field changes.
   *
   * @implemented
   */

  @meta.implemented
  OnModified(_options = {})
  {
    this.RebuildEffectHandles(this.#cachedEffect);
    return true;
  }

  /**
   * Caches the shader and records whether it reflects a constant of this name;
   * no GPU handle is bound.
   *
   * @adapted
   */

  @meta.adapted
  RebuildEffectHandles(effectRes)
  {
    this.#cachedEffect = effectRes;
    // TriFloatArrayParameter.cpp:82
    const used = !!this.name && !!effectRes && !!effectRes.GetConstant(this.name);
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
  }

  /**
   * Packs the rows contiguously into the destination, stopping at whichever limit comes first: the last row, the destination length, or the byte budget; a final row may be written partially.
   *
   * @adapted
   * @param size byte budget in the destination, four bytes per float
   * Carbon declaration: TriFloatArrayParameter::CopyValueToEffect (trinity/trinity/Shader/Parameter/TriFloatArrayParameter.h:56).
   */
  @meta.adapted
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

// Exact identities from TriFloatArrayParameter_Blue.cpp; no exposure chain.
