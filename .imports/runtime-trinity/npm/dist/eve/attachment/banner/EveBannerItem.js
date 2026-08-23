import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_bone, _init_extra_bone, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_reference, _init_extra_reference;

// Carbon persists banners as a raw structure list (BLUE_DECLARE_STRUCTURE_LIST
// on EveBannerSet.banners, READ | PERSIST), so every geometric field below
// round-trips.

/**
 * One authored banner quad: its bone attachment, placement, the two curvature
 * angles that bend it, and the SOF reference id identifying which banner is
 * shown.
 */
let _EveBannerItem;
new class extends _identity {
  static [class EveBannerItem extends CjsModel {
    static {
      ({
        e: [_init_bone, _init_extra_bone, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_reference, _init_extra_reference, _initProto],
        c: [_EveBannerItem, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveBannerItem",
        family: "eve/attachment/banners"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.int32], 16, "bone"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "position"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.quat], 16, "rotation"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "scaling"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "angleX"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "angleY"], [[io, io.persist, type, type.int32], 16, "reference"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon inlines the per-banner box inside the set rebuild; the port moves it onto the item so the shared item-set builder can read it.")], 18, "GetBounds"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Accessor for the shared item-set bounds builder; Carbon reads jt->bone directly.")], 18, "GetBoneIndex"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_reference(this);
    }
    bone = (_initProto(this), _init_bone(this, -1));
    position = (_init_extra_bone(this), _init_position(this, vec3.create()));
    rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    angleX = (_init_extra_scaling(this), _init_angleX(this, 0));
    angleY = (_init_extra_angleX(this), _init_angleY(this, 0));

    // Carbon keeps this as private structure metadata, but SOF-authored banner
    // identity is part of the editable description in CarbonEngineJS.
    reference = (_init_extra_angleY(this), _init_reference(this, 0));

    /** Carbon builds this inline in EveBannerSet::Rebuild (cpp:417-419): the
     * authored box is HALF-OPEN in z - (-0.5, -0.5, -0.5) to (0.5, 0.5, 0) - so a
     * banner bounds its own face and the depth behind it, not in front. Carbon
     * (row-vector) composes TransformationMatrix(scaling, rotation, position). */
    GetBounds(out) {
      const transform = mat4.fromRotationTranslationScale(_EveBannerItem.#transform, this.rotation, this.position, this.scaling);
      return box3.transformMat4(out, _EveBannerItem.#bounds, transform);
    }

    /** Carbon reads the item member directly (cpp:424); the item-set builder
     * needs the accessor every other set item already has. */
    GetBoneIndex() {
      return this.bone;
    }
  }];
  #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0);
  #transform = mat4.create();
  constructor() {
    super(_EveBannerItem), _initClass();
  }
}();

export { _EveBannerItem as EveBannerItem };
//# sourceMappingURL=EveBannerItem.js.map
