// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierTranslateWithCamera.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierTranslateWithCamera.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierTranslateWithCamera_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Transform modifier that moves a child with the camera, either pinning its
 * translation to the view position or offsetting it by the view position.
 */
@type.define({ className: "EveChildModifierTranslateWithCamera", family: "eve/child/modifiers" })
export class EveChildModifierTranslateWithCamera extends CjsModel
{
  @io.persist
  @type.boolean
  attachedToCamera = false;

  /**
   * Moves the child with the camera: attached mode replaces the translation
   * with the view position, otherwise the view position is added (Carbon
   * EveChildModifierTranslateWithCamera.cpp).
   *
   * @param {Object} context - frame context; reads context.renderContext
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [_boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [_bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.implemented
  ApplyTransform(context, transform, _boneCount = 0, _bones = null, out)
  {
    mat4.copy(out, transform);
    const renderContext = context?.renderContext;
    if (!renderContext)
    {
      return out;
    }
    const camPos = renderContext.GetViewPosition();
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
