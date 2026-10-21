import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierTranslateWithCamera.h
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierTranslateWithCamera.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierTranslateWithCamera_Blue.cpp
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";
import { IEveChildTransformModifier } from "./IEveChildTransformModifier.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";

/**
 * Transform modifier that moves a child with the camera, either pinning its
 * translation to the view position or offsetting it by the view position.
 */
@be.define("EveChildModifierTranslateWithCamera")
@be.mapInterface(IEveChildTransformModifier)
export class EveChildModifierTranslateWithCamera extends IEveChildTransformModifier
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  attachedToCamera = false;

  /**
   * Moves the child with the camera: attached mode replaces the translation
   * with the view position, otherwise the view position is added (Carbon
   * EveChildModifierTranslateWithCamera.cpp).
   *
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [_boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [_bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */

  @meta.implemented
  ApplyTransform(transform, _boneCount = 0, _bones = null, out)
  {
    mat4.copy(out, transform);
    const camPos = Tr2Renderer.GetViewPosition();
    if (this.attachedToCamera)
    {
      out[12] = camPos[0];
      out[13] = camPos[1];
      out[14] = camPos[2];
    }
    else
    {
      out[12] += camPos[0];
      out[13] += camPos[1];
      out[14] += camPos[2];
    }
    return out;
  }

}
