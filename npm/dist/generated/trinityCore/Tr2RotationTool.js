import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2ManipulationTool as _Tr2ManipulationTool } from '../../core/tool/Tr2ManipulationTool.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';

let _initClass, _init_precision, _init_extra_precision, _init_rotation, _init_extra_rotation;

/** Tr2RotationTool (trinityCore) - generated from schema shapeHash 5ff9cfe6.... */
let _Tr2RotationTool;
class Tr2RotationTool extends _Tr2ManipulationTool {
  static {
    ({
      e: [_init_precision, _init_extra_precision, _init_rotation, _init_extra_rotation],
      c: [_Tr2RotationTool, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RotationTool",
      family: "trinityCore"
    })], [[[io, io.readwrite, type, type.float32], 16, "precision"], [[io, io.read, type, type.quat], 16, "rotation"]], 0, void 0, _Tr2ManipulationTool));
  }
  constructor(...args) {
    super(...args);
    _init_extra_rotation(this);
  }
  /** m_precision (float) [READWRITE] */
  precision = _init_precision(this, 1);

  /** m_rotation (Quaternion) [READ] */
  rotation = (_init_extra_precision(this), _init_rotation(this, quat.create()));
  static {
    _initClass();
  }
}

export { _Tr2RotationTool as Tr2RotationTool };
//# sourceMappingURL=Tr2RotationTool.js.map
