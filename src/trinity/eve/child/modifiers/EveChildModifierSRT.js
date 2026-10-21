import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierSRT.h
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierSRT.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { IEveChildTransformModifier } from "./IEveChildTransformModifier.js";
import { meta, type, blue } from "#schema";


/**
 * Transform modifier that applies a fixed scale, rotation and translation ahead
 * of the child's own transform.
 */
@be.define("EveChildModifierSRT")
@be.mapInterface(IEveChildTransformModifier)
export class EveChildModifierSRT extends IEveChildTransformModifier
{
  @blue.readwrite
  @blue.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  @blue.readwrite
  @blue.persist
  @type.vec3
  translation = vec3.create();

  static _scratch = mat4.create();

  /**
   * Applies this modifier's scale/rotation/translation before the incoming
   * transform (Carbon EveChildModifierSRT::ApplyTransform:
   * TransformationMatrix(s,r,t) * transform in row-vector convention - SRT
   * first, then transform, which is mat4.multiply(out, transform, srt) in
   * gl-matrix). The returned Matrix is written into caller-owned `out`.
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [_boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [_bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @blue.method
  @meta.implemented
  ApplyTransform(transform, _boneCount = 0, _bones = null, out)
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
