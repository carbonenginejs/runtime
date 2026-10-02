// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierSRT.h
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierSRT.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { IEveChildTransformModifier } from "./IEveChildTransformModifier.js";
import { meta } from "#schema";


/**
 * Transform modifier that applies a fixed scale, rotation and translation ahead
 * of the child's own transform.
 */
@meta.define({
  className: "EveChildModifierSRT",
  family: "eve/child/modifiers"
})
export class EveChildModifierSRT extends IEveChildTransformModifier
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  static _scratch = mat4.create();

  /**
   * Applies this modifier's scale/rotation/translation before the incoming
   * transform (Carbon EveChildModifierSRT::ApplyTransform:
   * TransformationMatrix(s,r,t) * transform in row-vector convention - SRT
   * first, then transform, which is mat4.multiply(out, transform, srt) in
   * gl-matrix). Context-first for a uniform modifier apply loop; SRT is not
   * camera-dependent, so context is unused.
   * @param {Object} _context - unused (SRT is not a contextual modifier)
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [_boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [_bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @meta.blue.method
  @meta.adapted
  ApplyTransform(_context, transform, _boneCount = 0, _bones = null, out)
  {
    const local = mat4.fromRotationTranslationScale(
      EveChildModifierSRT._scratch,
      this.rotation,
      this.translation,
      this.scaling
    );
    return mat4.multiply(out, transform, local);
  }
}
