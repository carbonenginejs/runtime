// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierHaloInverted.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";
import { DistanceBase } from "./EveChildModifierTransformCommon.js";


/**
 * Transform modifier that scales a child to nothing as its local Z axis turns to
 * face the camera - the inverse of a halo, and despite the name not a subclass
 * of one.
 */
@type.define({
  className: "EveChildModifierHaloInverted",
  family: "eve/child/modifiers"
})
export class EveChildModifierHaloInverted extends CjsModel
{
  static scratch = {
    alignMat: mat4.create(),
    d: vec3.create(),
    forward: vec3.create(),
    scaleVec: vec3.create(),
    scalingTransform: mat4.create()
  };

  /**
   * Scales the child down to zero as its local Z axis turns to face the camera -
   * the opposite of a standard halo. Reproduces
   * EveChildModifierHaloInverted::ApplyTransform (Carbon): scale =
   * clamp(dot(normalize(d), -transformZ), 0), then
   * return scalingTransform * alignMat * transform. Despite the class name it is
   * NOT a subclass of Halo - it is its own modifier over DistanceBase.
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

    const { alignMat, d, forward, scaleVec, scalingTransform } = this.constructor.scratch;

    // distCenter is computed by DistanceBase and left unused here, as in Carbon.
    DistanceBase(context, transform, alignMat, d);

    vec3.set(forward, transform[8], transform[9], transform[10]);
    vec3.normalize(forward, forward);
    vec3.normalize(d, d);

    // Carbon: scale = Dot(Normalize(d), -forward) = -Dot(Normalize(d), forward).
    let scale = -vec3.dot(d, forward);

    if (scale < 0)
    {
      scale = 0;
    }

    vec3.set(scaleVec, scale, scale, scale);
    mat4.fromScaling(scalingTransform, scaleVec);

    // Carbon (row-vector): scalingTransform * alignMat * transform - scaling
    // applied first, transform last. In gl-matrix that is
    // out = transform . align . scaling.
    mat4.multiply(out, transform, alignMat);
    mat4.multiply(out, out, scalingTransform);
    return out;
  }
}
