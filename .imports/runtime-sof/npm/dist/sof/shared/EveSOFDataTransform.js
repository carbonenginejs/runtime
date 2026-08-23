import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling;

/** EveSOFDataTransform (eve) - generated from schema shapeHash a3d40133.... */
let _EveSOFDataTransform;
class EveSOFDataTransform extends CjsModel {
  static {
    ({
      e: [_init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling],
      c: [_EveSOFDataTransform, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataTransform",
      family: "eve"
    })], [[[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_scaling(this);
  }
  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  boneIndex = _init_boneIndex(this, -1);

  /** m_position (Vector3) [READWRITE, PERSIST] */
  position = (_init_extra_boneIndex(this), _init_position(this, vec3.create()));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
  GetTransform(out) {
    return mat4.fromRotationTranslationScale(out, this.rotation, this.position, this.scaling);
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataTransform as EveSOFDataTransform };
//# sourceMappingURL=EveSOFDataTransform.js.map
