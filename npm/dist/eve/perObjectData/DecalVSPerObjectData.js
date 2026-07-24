import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_worldMatrix, _init_extra_worldMatrix, _init_invWorldMatrix, _init_extra_invWorldMatrix, _init_decalMatrix, _init_extra_decalMatrix, _init_inverseDecalMatrix, _init_extra_inverseDecalMatrix, _init_parentBoneMatrix, _init_extra_parentBoneMatrix, _init_invParentBoneMatrix, _init_extra_invParentBoneMatrix;
let _DecalVSPerObjectData;
class DecalVSPerObjectData extends CjsModel {
  static {
    ({
      e: [_init_worldMatrix, _init_extra_worldMatrix, _init_invWorldMatrix, _init_extra_invWorldMatrix, _init_decalMatrix, _init_extra_decalMatrix, _init_inverseDecalMatrix, _init_extra_inverseDecalMatrix, _init_parentBoneMatrix, _init_extra_parentBoneMatrix, _init_invParentBoneMatrix, _init_extra_invParentBoneMatrix],
      c: [_DecalVSPerObjectData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "DecalVSPerObjectData",
      family: "eve/perObjectData"
    })], [[[type, type.mat4], 16, "worldMatrix"], [[type, type.mat4], 16, "invWorldMatrix"], [[type, type.mat4], 16, "decalMatrix"], [[type, type.mat4], 16, "inverseDecalMatrix"], [[type, type.mat4], 16, "parentBoneMatrix"], [[type, type.mat4], 16, "invParentBoneMatrix"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_invParentBoneMatrix(this);
  }
  worldMatrix = _init_worldMatrix(this, mat4.create());
  invWorldMatrix = (_init_extra_worldMatrix(this), _init_invWorldMatrix(this, mat4.create()));
  decalMatrix = (_init_extra_invWorldMatrix(this), _init_decalMatrix(this, mat4.create()));
  inverseDecalMatrix = (_init_extra_decalMatrix(this), _init_inverseDecalMatrix(this, mat4.create()));
  parentBoneMatrix = (_init_extra_inverseDecalMatrix(this), _init_parentBoneMatrix(this, mat4.create()));
  invParentBoneMatrix = (_init_extra_parentBoneMatrix(this), _init_invParentBoneMatrix(this, mat4.create()));
  static {
    _initClass();
  }
}

export { _DecalVSPerObjectData as DecalVSPerObjectData };
//# sourceMappingURL=DecalVSPerObjectData.js.map
