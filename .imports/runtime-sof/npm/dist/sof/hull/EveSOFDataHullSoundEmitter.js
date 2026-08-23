import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_name, _init_extra_name, _init_prefix, _init_extra_prefix, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_attenuationScalingFactor, _init_extra_attenuationScalingFactor;

/** EveSOFDataHullSoundEmitter (eve) - generated from schema shapeHash 7a1c55fe.... */
let _EveSOFDataHullSoundE;
class EveSOFDataHullSoundEmitter extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_prefix, _init_extra_prefix, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_attenuationScalingFactor, _init_extra_attenuationScalingFactor],
      c: [_EveSOFDataHullSoundE, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullSoundEmitter",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "prefix"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.float32], 16, "attenuationScalingFactor"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_attenuationScalingFactor(this);
  }
  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_prefix (std::wstring) [READWRITE, PERSIST] */
  prefix = (_init_extra_name(this), _init_prefix(this, ""));

  /** m_position (Vector3) [READWRITE, PERSIST] */
  position = (_init_extra_prefix(this), _init_position(this, vec3.create()));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));

  /** m_attenuationScalingFactor (float) [READWRITE, PERSIST] */
  attenuationScalingFactor = (_init_extra_rotation(this), _init_attenuationScalingFactor(this, 1));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullSoundE as EveSOFDataHullSoundEmitter };
//# sourceMappingURL=EveSOFDataHullSoundEmitter.js.map
