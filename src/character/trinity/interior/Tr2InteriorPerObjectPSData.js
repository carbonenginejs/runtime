// Source: trinity/trinity/Interior/Tr2InteriorConstantBufferFormats.h
import { type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";

/**
 * Per-object interior pixel-stage data holding fixed-capacity light and shadow
 * inputs.
 */
@blue.define("Tr2InteriorPerObjectPSData")
export class Tr2InteriorPerObjectPSData
{

  /** lightCount (int32_t) */
  @type.int32
  lightCount = 0;

  /** padding (int32_t[3]) */
  @type.array("int32")
  padding = [ 0, 0, 0 ];

  /** pointLights (Tr2InteriorPerObjectLightData[10]) */
  @type.array({
    kind: "root",
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

}
