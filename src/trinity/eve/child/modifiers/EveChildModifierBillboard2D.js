import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/EveChildModifierBillboard2D.cpp
import { IEveChildTransformModifier } from "./IEveChildTransformModifier.js";
import { meta, blue } from "#schema";
import { EveChildModifierTransformCommon } from "./EveChildModifierTransformCommon.js";


/**
 * Transform modifier that aligns a child to the screen plane, leaving it facing
 * the viewer whatever the camera does.
 */
@be.define("EveChildModifierBillboard2D")
@be.mapInterface(IEveChildTransformModifier)
export class EveChildModifierBillboard2D extends IEveChildTransformModifier
{
  /**
   * Screen-aligned billboard. Reproduces
   * EveChildModifierBillboard2D::ApplyTransform (Carbon), which forwards to the
   * shared Billboard2D helper.
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @blue.method
  @meta.implemented
  ApplyTransform(transform, boneCount, bones, out)
  {
    return EveChildModifierTransformCommon.billboard2D(transform, out);
  }
}
