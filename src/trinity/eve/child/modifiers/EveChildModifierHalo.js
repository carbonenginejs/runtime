// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierHalo.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { IEveChildTransformModifier } from "./IEveChildTransformModifier.js";
import { carbon, impl, type } from "#schema";


/**
 * Transform modifier that screen-aligns a child and shrinks it by the squared
 * facing of its local Z axis toward the camera, so a halo fades out edge-on.
 */
@type.define({
  className: "EveChildModifierHalo",
  family: "eve/child/modifiers"
})
export class EveChildModifierHalo extends IEveChildTransformModifier
{
  static scratch = {
    d: vec3.create(),
    childZ: vec3.create()
  };

  /**
   * Screen-aligned halo that fades out as its local Z axis turns away from the
   * camera. Reproduces EveChildModifierHalo::ApplyTransform (Carbon): it inlines
   * Billboard2D's inverse-view row copy (it does NOT call the shared helper),
   * then scales each parent axis by clamp(dot(normalize(camPos - myPos),
   * normalize(transformZ)), 0) SQUARED - the facing falloff. Reads
   * GetViewPosition + GetInverseViewTransform.
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
    const renderContext = context?.renderContext;

    if (!renderContext)
    {
      return mat4.copy(out, transform);
    }

    const { d, childZ } = this.constructor.scratch;
    const camPos = renderContext.GetViewPosition();

    d[0] = camPos[0] - transform[12];
    d[1] = camPos[1] - transform[13];
    d[2] = camPos[2] - transform[14];
    vec3.normalize(d, d);

    vec3.set(childZ, transform[8], transform[9], transform[10]);
    vec3.normalize(childZ, childZ);

    let scale = vec3.dot(d, childZ);

    if (scale < 0)
    {
      scale = 0;
    }

    const facing = scale * scale;
    const scaleX = vec3.length(transform.subarray(0, 3)) * facing;
    const scaleY = vec3.length(transform.subarray(4, 7)) * facing;
    const scaleZ = vec3.length(transform.subarray(8, 11)) * facing;

    const invView = renderContext.GetInverseViewTransform();

    mat4.copy(out, transform);
    out[0] = invView[0] * scaleX;
    out[1] = invView[1] * scaleX;
    out[2] = invView[2] * scaleX;
    out[4] = invView[4] * scaleY;
    out[5] = invView[5] * scaleY;
    out[6] = invView[6] * scaleY;
    out[8] = invView[8] * scaleZ;
    out[9] = invView[9] * scaleZ;
    out[10] = invView[10] * scaleZ;
    return out;
  }
}
