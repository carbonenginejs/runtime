// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierAttachToBone.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierAttachToBone.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierAttachToBone_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

@type.define({ className: "EveChildModifierAttachToBone", family: "eve/child/modifiers" })
export class EveChildModifierAttachToBone extends CjsModel
{
  @io.persist
  @type.int32
  boneIndex = -1;

  /**
   * Composes the bone transform BEFORE the child transform (Carbon
   * EveChildModifierAttachToBone.cpp: `boneMatrix * transform`, row-vector -
   * bone first, so gl composes transform . bone). Bones arrive as the
   * Float4x3 column-stride 12-float palette (skill gotcha 7:
   * rows are (v0,v4,v8,v12) / (v1,v5,v9,v13) / (v2,v6,v10,v14)).
   *
   * @param {Object} _context - unused (not camera dependent)
   * @param {Float32Array} transform - source (read only)
   * @param {Number} boneCount
   * @param {Float32Array|Array} bones - Float4x3 palette, 12 floats per bone
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @carbon.method
  @impl.implemented
  ApplyTransform(_context, transform, boneCount = 0, bones = null, out)
  {
    if (this.boneIndex < 0 || this.boneIndex >= boneCount || !bones)
    {
      return mat4.copy(out, transform);
    }
    const bone = EveChildModifierAttachToBone.#boneMatrix;
    const offset = this.boneIndex * 12;
    // TriMatrixCopyFrom3x4: Float4x3 row i holds column-stride components.
    bone[0] = bones[offset];
    bone[4] = bones[offset + 1];
    bone[8] = bones[offset + 2];
    bone[12] = bones[offset + 3];
    bone[1] = bones[offset + 4];
    bone[5] = bones[offset + 5];
    bone[9] = bones[offset + 6];
    bone[13] = bones[offset + 7];
    bone[2] = bones[offset + 8];
    bone[6] = bones[offset + 9];
    bone[10] = bones[offset + 10];
    bone[14] = bones[offset + 11];
    // Carbon (row-vector): boneMatrix * transform - bone first.
    return mat4.multiply(out, transform, bone);
  }

  @carbon.method
  @impl.implemented
  SetBoneIndex(index)
  {
    this.boneIndex = Number(index) | 0;
  }

  static #boneMatrix = mat4.create();

}
