// Source: E:\carbonengine\trinity\trinity\Eve\UI\EveSpherePin.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Per-object values for a standalone UI sphere pin - world matrix plus the pin's
 * position, orientation, colour, threshold, precalculated radius and UV - as
 * values a renderer packs into a constant buffer.
 */
@type.define({
  className: "EveSpherePinPerObjectData",
  family: "eve/perObjectData"
})
export class EveSpherePinPerObjectData extends CjsModel
{
  @type.mat4
  worldMatrix = mat4.create();

  @type.vec4
  pinPosition = vec4.create();

  // EveSpherePin.h:33 declares `Vector4 m_pinRotation`, not Quaternion - the
  // byte-identical sibling EveChildSpherePinPerObjectData and the registered
  // struct def both agree on VECTOR.
  @type.vec4
  pinRotation = vec4.create();

  @type.color
  pinColor = vec4.create();

  @type.vec4
  pinThreshold = vec4.create();

  @type.vec4
  pinRadiusPrecalc = vec4.create();

  @type.vec4
  pinUV = vec4.create();
}
