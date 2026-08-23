// Source: trinity/trinity/Interior/Tr2InteriorConstantBufferFormats.h
import { impl, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";

/**
 * Per-object interior pixel-stage data holding fixed-capacity light and shadow
 * inputs.
 */
@type.define({ className: "Tr2InteriorPerObjectPSData", family: "interior" })
export class Tr2InteriorPerObjectPSData extends CjsModel
{

  /** lightCount (int32_t) */
  @type.int32
  lightCount = 0;

  /** padding (int32_t[3]) */
  @type.array("int32")
  padding = [ 0, 0, 0 ];

  /** pointLights (Tr2InteriorPerObjectLightData[10]) */
  @type.array({
    kind: "struct",
    className: "Tr2InteriorPerObjectLightData"
  })
  pointLights = Array.from({ length: 10 }, () => new Tr2InteriorPerObjectLightData());

  /** shadowCaster0 (Vector4) */
  @type.vec4
  shadowCaster0 = vec4.create();

  /** shadowCaster1 (Vector4) */
  @type.vec4
  shadowCaster1 = vec4.create();

  /** spotLights (Matrix[4]) */
  @type.array("mat4")
  spotLights = Array.from({ length: 4 }, () => mat4.create());

  /**
   * Imports values while normalizing padding, ten point lights, and four
   * spot-light matrices to Carbon cardinality.
   */
  @impl.custom
  @impl.reason("Preserves Carbon fixed-array cardinalities when importing plain JS values.")
  SetValues(values = {}, options = {})
  {
    const normalized = { ...values };
    if (Object.hasOwn(values, "padding"))
    {
      normalized.padding = Array.from({ length: 3 }, (_, index) => Number(values.padding?.[index] ?? 0) | 0);
    }
    if (Object.hasOwn(values, "pointLights"))
    {
      normalized.pointLights = Array.from({ length: 10 }, (_, index) =>
        values.pointLights?.[index] ?? new Tr2InteriorPerObjectLightData());
    }
    if (Object.hasOwn(values, "spotLights"))
    {
      normalized.spotLights = FixedMat4Array(values.spotLights, 4);
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
