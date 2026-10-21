import { meta } from "#schema";
// Source: trinity/trinity/Interior/Tr2InteriorConstantBufferFormats.h
import { type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";

/**
 * Per-light interior pixel-stage data holding light, mirror, shadow, bounds,
 * and auxiliary parameters.
 */
@meta.carbon("Tr2InteriorPerLightPSData")
export class Tr2InteriorPerLightPSData
{

  /** lightData (Tr2InteriorPerObjectLightData) */
  @type.root("Tr2InteriorPerObjectLightData")
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

}
