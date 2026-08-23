import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_translation, _init_extra_translation, _init_boneIndex, _init_extra_boneIndex;

/** Runtime representation of Carbon's 44-byte EveSofDataMeshInstance structure. */
let _EveSofDataMeshInstan;
class EveSofDataMeshInstance extends CjsModel {
  static {
    ({
      e: [_init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_translation, _init_extra_translation, _init_boneIndex, _init_extra_boneIndex],
      c: [_EveSofDataMeshInstan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSofDataMeshInstance",
      family: "eve"
    })], [[[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.int32], 16, "boneIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_boneIndex(this);
  }
  /** Quaternion at byte offset 0. */
  rotation = _init_rotation(this, quat.create());

  /** Vector3 at byte offset 16. Identity is the runtime-friendly default. */
  scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** Vector3 at byte offset 28. */
  translation = (_init_extra_scaling(this), _init_translation(this, vec3.create()));

  /** Signed int32 at byte offset 40. */
  boneIndex = (_init_extra_translation(this), _init_boneIndex(this, 0));
  static {
    _initClass();
  }
}

export { _EveSofDataMeshInstan as EveSofDataMeshInstance };
//# sourceMappingURL=EveSofDataMeshInstance.js.map
