import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_bone, _init_extra_bone, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_reference, _init_extra_reference;

// Carbon persists banners as a raw structure list (BLUE_DECLARE_STRUCTURE_LIST
// on EveBannerSet.banners, READ | PERSIST), so every geometric field below
// round-trips.
let _EveBannerItem;
class EveBannerItem extends CjsModel {
  static {
    ({
      e: [_init_bone, _init_extra_bone, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_reference, _init_extra_reference],
      c: [_EveBannerItem, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveBannerItem",
      family: "eve/attachment/banners"
    })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.int32], 16, "bone"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "position"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.quat], 16, "rotation"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "scaling"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "angleX"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "angleY"], [[io, io.persist, type, type.int32], 16, "reference"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_reference(this);
  }
  bone = _init_bone(this, -1);
  position = (_init_extra_bone(this), _init_position(this, vec3.create()));
  rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));
  scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
  angleX = (_init_extra_scaling(this), _init_angleX(this, 0));
  angleY = (_init_extra_angleX(this), _init_angleY(this, 0));

  // Carbon keeps this as private structure metadata, but SOF-authored banner
  // identity is part of the editable description in CarbonEngineJS.
  reference = (_init_extra_angleY(this), _init_reference(this, 0));
  static {
    _initClass();
  }
}

export { _EveBannerItem as EveBannerItem };
//# sourceMappingURL=EveBannerItem.js.map
