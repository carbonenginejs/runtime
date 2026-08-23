// Source: trinity/trinity/Interior/Tr2InteriorConstantBufferFormats.h
import { impl, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";

/**
 * Per-light interior pixel-stage data holding light, mirror, shadow, bounds,
 * and auxiliary parameters.
 */
@type.define({ className: "Tr2InteriorPerLightPSData", family: "interior" })
export class Tr2InteriorPerLightPSData extends CjsModel
{

  /** lightData (Tr2InteriorPerObjectLightData) */
  @type.struct("Tr2InteriorPerObjectLightData")
  lightData = new Tr2InteriorPerObjectLightData();

  /** mirrorToWorldMatrix (Matrix) */
  @type.mat4
  mirrorToWorldMatrix = mat4.create();

  /** shadowMatrix (Matrix[6]) */
  @type.array("mat4")
  shadowMatrix = Array.from({ length: 6 }, () => mat4.create());

  /** shadowRect (Vector4[6]) */
  @type.array("vec4")
  shadowRect = Array.from({ length: 6 }, () => vec4.create());

  /** shadowInfluence (Vector4[6]) */
  @type.array("vec4")
  shadowInfluence = Array.from({ length: 6 }, () => vec4.create());

  /** boundingBox (Matrix) */
  @type.mat4
  boundingBox = mat4.create();

  /** additionalParameters (Vector4) */
  @type.vec4
  additionalParameters = vec4.create();

  /**
   * Imports values while normalizing the three six-element shadow arrays to
   * Carbon cardinality.
   */
  @impl.custom
  @impl.reason("Preserves Carbon fixed-array cardinalities when importing plain JS values.")
  SetValues(values = {}, options = {})
  {
    const normalized = { ...values };
    if (Object.hasOwn(values, "shadowMatrix"))
    {
      normalized.shadowMatrix = FixedMat4Array(values.shadowMatrix, 6);
    }
    if (Object.hasOwn(values, "shadowRect"))
    {
      normalized.shadowRect = FixedVec4Array(values.shadowRect, 6);
    }
    if (Object.hasOwn(values, "shadowInfluence"))
    {
      normalized.shadowInfluence = FixedVec4Array(values.shadowInfluence, 6);
    }
    return super.SetValues(normalized, options);
  }

}

function FixedMat4Array(values, count)
{
  return Array.from({ length: count }, (_, index) =>
  {
    const value = values?.[index];
    return value?.length === 16 ? mat4.copy(mat4.create(), value) : mat4.create();
  });
}

function FixedVec4Array(values, count)
{
  return Array.from({ length: count }, (_, index) =>
  {
    const value = values?.[index];
    return vec4.fromValues(
      Number(value?.[0] ?? 0),
      Number(value?.[1] ?? 0),
      Number(value?.[2] ?? 0),
      Number(value?.[3] ?? 0)
    );
  });
}
