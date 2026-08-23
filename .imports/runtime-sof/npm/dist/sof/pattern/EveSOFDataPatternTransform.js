import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_position, _init_extra_position, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_isMirrored, _init_extra_isMirrored;

/** EveSOFDataPatternTransform (eve) - generated from schema shapeHash 67e6771a.... */
let _EveSOFDataPatternTra;
class EveSOFDataPatternTransform extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_isMirrored, _init_extra_isMirrored],
      c: [_EveSOFDataPatternTra, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataPatternTransform",
      family: "eve"
    })], [[[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.boolean], 16, "isMirrored"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_isMirrored(this);
  }
  /** m_position (Vector3) [READWRITE, PERSIST] */
  position = _init_position(this, vec3.create());

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_position(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_scaling(this), _init_rotation(this, quat.create()));

  /** m_isMirrored (bool) [READWRITE, PERSIST] */
  isMirrored = (_init_extra_rotation(this), _init_isMirrored(this, false));

  /** Clears the projection transform while retaining its value objects. */
  Empty() {
    vec3.set(this.position, 0, 0, 0);
    vec3.set(this.scaling, 0, 0, 0);
    quat.identity(this.rotation);
    this.isMirrored = false;
    return this;
  }

  /** Copies the transform state retained by a Trinity custom mask. */
  SetFromCustomMask(customMask) {
    if (!customMask) return this.Empty();
    vec3.copy(this.position, customMask.translation);
    vec3.copy(this.scaling, customMask.scaling);
    quat.copy(this.rotation, customMask.rotation);
    this.isMirrored = Boolean(customMask.isMirrored);
    return this;
  }

  /** Composes the Carbon position/rotation/scaling fields into a matrix. */
  GetTransform(out) {
    return mat4.fromRotationTranslationScale(out, this.rotation, this.position, this.scaling);
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataPatternTra as EveSOFDataPatternTransform };
//# sourceMappingURL=EveSOFDataPatternTransform.js.map
