// Source: trinity/trinity/Interior/Tr2InteriorConstantBufferFormats.h
import { meta } from "#schema";
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";

/**
 * Per-light interior pixel-stage data holding light, mirror, shadow, bounds,
 * and auxiliary parameters.
 */
@meta.define({ className: "Tr2InteriorPerLightPSData", family: "interior" })
export class Tr2InteriorPerLightPSData
{

  /** lightData (Tr2InteriorPerObjectLightData) */
  @meta.type.struct("Tr2InteriorPerObjectLightData")
  lightData = new Tr2InteriorPerObjectLightData();

  /** mirrorToWorldMatrix (Matrix) */
  @meta.type.mat4
  mirrorToWorldMatrix = mat4.create();

  /** shadowMatrix (Matrix[6]) */
  @meta.type.array("mat4")
  shadowMatrix = Array.from({ length: 6 }, () => mat4.create());

  /** shadowRect (Vector4[6]) */
  @meta.type.array("vec4")
  shadowRect = Array.from({ length: 6 }, () => vec4.create());

  /** shadowInfluence (Vector4[6]) */
  @meta.type.array("vec4")
  shadowInfluence = Array.from({ length: 6 }, () => vec4.create());

  /** boundingBox (Matrix) */
  @meta.type.mat4
  boundingBox = mat4.create();

  /** additionalParameters (Vector4) */
  @meta.type.vec4
  additionalParameters = vec4.create();

  /**
   * Imports values while normalizing the three six-element shadow arrays to
   * Carbon cardinality.
   *
   * Custom: Carbon declares fixed-size arrays in
   * trinity/trinity/Interior/Tr2InteriorConstantBufferFormats.h; these structs
   * have no values-import method. JavaScript import supplies the normalization
   * and default filling described here; these are not native initializers.
   *
   * Supplied shadow arrays are truncated or filled to six entries. Missing or
   * non-16-element matrices become identity matrices; missing vector components
   * become zero. Omitted fields are left to the dictionary reader.
   *
   * @param {object} [values={}] Field values to apply through the schema setter.
   * @param {object} [options={}] Options forwarded to the dictionary reader.
   * @returns {Set<string>|boolean} The dictionary reader's change result.
   */
  @meta.ours
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
    const changed = new DictReader(options).ReadInto(this, normalized, null);
    return options.returnBoolean === true ? changed.size > 0 : changed;
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
