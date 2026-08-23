import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_position, _init_extra_position, _init_direction, _init_extra_direction, _init_scale, _init_extra_scale, _init_boneIndex, _init_extra_boneIndex;

/**
 * Attachment point held as decomposed position, orientation, scale and bone
 * index, as stored inside a locator set.
 */
let _Locator;
class Locator extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_direction, _init_extra_direction, _init_scale, _init_extra_scale, _init_boneIndex, _init_extra_boneIndex],
      c: [_Locator, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Locator",
      family: "eve/utils"
    })], [[[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "direction"], [[io, io.persist, type, type.vec3], 16, "scale"], [[io, io.persist, type, type.int32], 16, "boneIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_boneIndex(this);
  }
  position = _init_position(this, vec3.create());
  direction = (_init_extra_position(this), _init_direction(this, quat.create()));
  scale = (_init_extra_direction(this), _init_scale(this, vec3.fromValues(1, 1, 1)));
  boneIndex = (_init_extra_scale(this), _init_boneIndex(this, -1));
  static {
    _initClass();
  }
}

export { _Locator as Locator };
//# sourceMappingURL=Locator.js.map
