// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierBillboard2D.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { Billboard2D } from "./EveChildModifierTransformCommon.js";


/**
 * Transform modifier that aligns a child to the screen plane, leaving it facing
 * the viewer whatever the camera does.
 */
@type.define({
  className: "EveChildModifierBillboard2D",
  family: "eve/child/modifiers"
})
export class EveChildModifierBillboard2D extends CjsModel
{
  /**
   * Screen-aligned billboard. Reproduces
   * EveChildModifierBillboard2D::ApplyTransform (Carbon), which forwards to the
   * shared Billboard2D helper.
   * @param {Object} context - frame context; reads context.renderContext
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.implemented
  ApplyTransform(context, transform, boneCount, bones, out)
  {
    if (!context?.renderContext)
    {
      return mat4.copy(out, transform);
    }

    return Billboard2D(context, transform, out);
  }
}
