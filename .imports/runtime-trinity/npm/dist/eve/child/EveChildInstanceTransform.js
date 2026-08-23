import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_scale, _init_extra_scale, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_boneIndex, _init_extra_boneIndex;

/** EveChildInstanceTransform (eve/child) - generated from schema shapeHash 9e0ec0c7.... */
let _EveChildInstanceTran;
class EveChildInstanceTransform extends CjsModel {
  static {
    ({
      e: [_init_scale, _init_extra_scale, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_boneIndex, _init_extra_boneIndex],
      c: [_EveChildInstanceTran, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildInstanceTransform",
      family: "eve/child"
    })], [[[type, type.vec3], 16, "scale"], [[type, type.quat], 16, "rotation"], [[type, type.vec3], 16, "translation"], [[type, type.int32], 16, "boneIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_boneIndex(this);
  }
  /** scale (Vector3) */
  scale = _init_scale(this, vec3.fromValues(1, 1, 1));

  /** rotation (Quaternion) */
  rotation = (_init_extra_scale(this), _init_rotation(this, quat.create()));

  /** translation (Vector3) */
  translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));

  /** boneIndex (int32_t) */
  boneIndex = (_init_extra_translation(this), _init_boneIndex(this, -1));
  static {
    _initClass();
  }
}

export { _EveChildInstanceTran as EveChildInstanceTransform };
//# sourceMappingURL=EveChildInstanceTransform.js.map
