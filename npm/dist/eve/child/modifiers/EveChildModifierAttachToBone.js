import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_boneIndex, _init_extra_boneIndex;
let _EveChildModifierAtta;
new class extends _identity {
  static [class EveChildModifierAttachToBone extends CjsModel {
    static {
      ({
        e: [_init_boneIndex, _init_extra_boneIndex, _initProto],
        c: [_EveChildModifierAtta, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildModifierAttachToBone",
        family: "eve/child/modifiers"
      })], [[[io, io.persist, type, type.int32], 16, "boneIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "ApplyTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetBoneIndex"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_boneIndex(this);
    }
    boneIndex = (_initProto(this), _init_boneIndex(this, -1));

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
    ApplyTransform(_context, transform, boneCount = 0, bones = null, out) {
      if (this.boneIndex < 0 || this.boneIndex >= boneCount || !bones) {
        return mat4.copy(out, transform);
      }
      const bone = _EveChildModifierAtta.#boneMatrix;
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
    SetBoneIndex(index) {
      this.boneIndex = Number(index) | 0;
    }
  }];
  #boneMatrix = mat4.create();
  constructor() {
    super(_EveChildModifierAtta), _initClass();
  }
}();

export { _EveChildModifierAtta as EveChildModifierAttachToBone };
//# sourceMappingURL=EveChildModifierAttachToBone.js.map
