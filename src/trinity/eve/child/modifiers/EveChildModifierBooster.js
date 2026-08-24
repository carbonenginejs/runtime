// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierBooster.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { IEveChildTransformModifier } from "./IEveChildTransformModifier.js";
import { carbon, impl, type } from "#schema";
import { DistanceBase } from "./EveChildModifierTransformCommon.js";


/**
 * Transform modifier that scales a fixed-radius booster sphere so it keeps a
 * constant apparent size as camera distance changes, then re-centres it so its
 * near edge stays put.
 */
@type.define({
  className: "EveChildModifierBooster",
  family: "eve/child/modifiers"
})
export class EveChildModifierBooster extends IEveChildTransformModifier
{
  static scratch = {
    alignMat: mat4.create(),
    d: vec3.create(),
    scaleVec: vec3.create(),
    transVec: vec3.create(),
    scalingTransform: mat4.create(),
    translationTransform: mat4.create()
  };

  /**
   * Scales a fixed-radius (0.5) sphere so it keeps a constant apparent size as
   * camera distance changes, then re-centers it so its near edge stays put.
   * Reproduces EveChildModifierBooster::ApplyTransform (Carbon):
   * B = sqrt(dist^2 - r^2); scale = B / dist; trans = -r^2 / (dist * scale);
   * return translationTransform * alignMat * scalingTransform * transform.
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

    const { alignMat, d, scaleVec, transVec, scalingTransform, translationTransform } = this.constructor.scratch;

    const distCenter = DistanceBase(context, transform, alignMat, d);

    const radius = 0.5;
    const B = Math.sqrt(distCenter * distCenter - radius * radius);
    const scale = B / distCenter;
    const trans = -(radius * radius) / (distCenter * scale);

    vec3.set(scaleVec, scale, scale, scale);
    mat4.fromScaling(scalingTransform, scaleVec);
    vec3.set(transVec, 0, 0, trans);
    mat4.fromTranslation(translationTransform, transVec);

    // Carbon (row-vector): translationTransform * alignMat * scalingTransform
    // * transform - T applied first, transform last. In gl-matrix that is
    // out = transform . scaling . align . translation.
    mat4.multiply(out, transform, scalingTransform);
    mat4.multiply(out, out, alignMat);
    mat4.multiply(out, out, translationTransform);
    return out;
  }
}
