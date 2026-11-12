// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.h
// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.cpp
import { exposure as be } from "#be";
import { IInitialize, BlueList } from "#blue";
import { INotify } from "#blue";
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { type } from "#schema";
import { FNV1_INITIAL, hashFnv1Floats, hashFnv1String } from "#utils/hash";
import { TriVector4 } from "./TriVector4.js";


/**
 * An ordered list of vec4 rows uploaded into one named shader constant array.
 * @adapted No own teardown hook: native Shader/Parameter/TriFloatArrayParameter.cpp:30-33 only returns; the value list acquires no observer, and cached shader references retain their existing lifetime policy.
 */
@be.define({
  name: "TriFloatArrayParameter",
  inherit: [ INotify, IInitialize ],
  // TriFloatArrayParameter_Blue.cpp:22-31, in Carbon's order.
  interfaces: [ ITriEffectParameter, INotify, IInitialize ],
  members: [
    [ be.ATTR, "name", be.READWRITE | be.NOTIFY | be.PERSIST ],
    [ be.ATTR, "value", be.READ | be.NOTIFY | be.PERSIST ],
    [ be.ATTR, "usedByCurrentTechnique", be.READ ],
    [ be.ATTR, "usedByCurrentEffect", be.READ ]
  ]
})
export class TriFloatArrayParameter extends ITriEffectParameter
{

  @type.list("TriVector4")
  value = new BlueList(TriVector4, { className: "TriVector4" });

  @type.boolean
  usedByCurrentTechnique = false;

  @type.boolean
  usedByCurrentEffect = false;


  @type.string
  name = "";

  _cachedEffect = null;

  /**
   * The shader constant-array name these rows bind to.
   *
   * @implemented
   */

  GetParameterName()
  {
    return this.name;
  }

  /**
   * Content hash: each row's vec4 bytes, then name.
   *
   * @adapted
   */

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

  OnModified(_options = {})
  {
    this.RebuildEffectHandles(this._cachedEffect);
    return true;
  }

  /**
   * Caches the shader and records whether it reflects a constant of this name;
   * no GPU handle is bound.
   *
   * @adapted
   */

  RebuildEffectHandles(effectRes)
  {
    this._cachedEffect = effectRes;
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
