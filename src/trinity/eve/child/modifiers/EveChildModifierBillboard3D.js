// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierBillboard3D.h
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierBillboard3D.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierBillboard3D_Blue.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { IEveChildTransformModifier } from "./IEveChildTransformModifier.js";
import { Billboard2D, DistanceBase } from "./EveChildModifierTransformCommon.js";

/**
 * Transform modifier that turns a child to face the camera, either as a fixed
 * billboard that preserves the child's authored scale or as a free one that
 * screen-aligns and then re-aligns along the camera direction.
 */
@type.define({ className: "EveChildModifierBillboard3D", family: "eve/child/modifiers" })
export class EveChildModifierBillboard3D extends IEveChildTransformModifier
{
  @io.persist
  @type.boolean
  fixed = false;

  /**
   * Camera-facing billboard (Carbon EveChildModifierBillboard3D.cpp).
   * Fixed mode: scale * Billboard3D(translation) * (invScale * transform)
   * (row-vector - scale first, transform last). Free mode: Billboard2D then
   * DistanceBase alignment: alignMat * billboard (align first).
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
    const renderContext = context?.renderContext;
    if (!renderContext)
    {
      return mat4.copy(out, transform);
    }

    const { scaleVec, scaleMat, invScaleMat, sansScale, basis, alignMat, d } = EveChildModifierBillboard3D.#scratch;
    if (this.fixed)
    {
      vec3.set(
        scaleVec,
        Math.hypot(transform[0], transform[1], transform[2]),
        Math.hypot(transform[4], transform[5], transform[6]),
        Math.hypot(transform[8], transform[9], transform[10])
      );
      mat4.fromScaling(scaleMat, scaleVec);
      mat4.invert(invScaleMat, scaleMat);
      // Carbon (row-vector): invScale * transform - invScale first.
      mat4.multiply(sansScale, transform, invScaleMat);
      EveChildModifierBillboard3D.#Billboard3D(basis, renderContext, transform);
      // Carbon (row-vector): scale * billboard * transformSansScale - scale first.
      mat4.multiply(out, sansScale, basis);
      mat4.multiply(out, out, scaleMat);
      return out;
    }

    Billboard2D(context, transform, out);
    DistanceBase(context, out, alignMat, d);
    // Carbon (row-vector): alignMat * billboard - align first.
    mat4.multiply(out, out, alignMat);
    return out;
  }

  /**
   * Carbon's Billboard3D free function: camera-facing basis at the given
   * transform's position (right = up x toObject fallback (1,0,0)).
   */
  static #Billboard3D(out, renderContext, transform)
  {
    const { toObject, right, up } = EveChildModifierBillboard3D.#scratch;
    const camPos = renderContext.GetViewPosition();
    vec3.set(toObject, camPos[0] - transform[12], camPos[1] - transform[13], camPos[2] - transform[14]);
    vec3.normalize(toObject, toObject);
    vec3.cross(right, EveChildModifierBillboard3D.#worldUp, toObject);
    vec3.normalize(right, right);
    if (vec3.squaredLength(right) === 0)
    {
      vec3.set(right, 1, 0, 0);
    }
    vec3.normalize(up, vec3.cross(up, toObject, right));
    mat4.identity(out);
    out[0] = right[0];
    out[1] = right[1];
    out[2] = right[2];
    out[4] = up[0];
    out[5] = up[1];
    out[6] = up[2];
    out[8] = toObject[0];
    out[9] = toObject[1];
    out[10] = toObject[2];
    return out;
  }

  static #worldUp = Object.freeze([0, 1, 0]);

  static #scratch = {
    scaleVec: vec3.create(),
    scaleMat: mat4.create(),
    invScaleMat: mat4.create(),
    sansScale: mat4.create(),
    basis: mat4.create(),
    alignMat: mat4.create(),
    d: vec3.create(),
    toObject: vec3.create(),
    right: vec3.create(),
    up: vec3.create()
  };

}
