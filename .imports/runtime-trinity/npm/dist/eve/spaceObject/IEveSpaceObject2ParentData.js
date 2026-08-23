import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_transform, _init_extra_transform, _init_killCount, _init_extra_killCount, _init_shipData, _init_extra_shipData, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_clipRadiusSq, _init_extra_clipRadiusSq, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_clipFactor, _init_extra_clipFactor, _init_clipFactor2, _init_extra_clipFactor2, _init_customData, _init_extra_customData;

/** The per-frame parent state a space object hands to its attachments. */
let _IEveSpaceObject2Pare;
new class extends _identity {
  static [class IEveSpaceObject2ParentData extends CjsModel {
    static {
      ({
        e: [_init_transform, _init_extra_transform, _init_killCount, _init_extra_killCount, _init_shipData, _init_extra_shipData, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_clipRadiusSq, _init_extra_clipRadiusSq, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_clipFactor, _init_extra_clipFactor, _init_clipFactor2, _init_extra_clipFactor2, _init_customData, _init_extra_customData],
        c: [_IEveSpaceObject2Pare, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "IEveSpaceObject2ParentData",
        family: "eve/spaceObject"
      })], [[[type, type.mat4], 16, "transform"], [[type, type.uint32], 16, "killCount"], [[type, type.vec4], 16, "shipData"], [[type, type.vec3], 16, "clipSphereCenter"], [[type, type.float32], 16, "clipRadiusSq"], [[type, type.float32], 16, "clipRadius2Sq"], [[type, type.float32], 16, "clipFactor"], [[type, type.float32], 16, "clipFactor2"], [[type, type.vec4], 16, "customData"]], 0, void 0, CjsModel));
    }
    /** transform (Matrix) - the parent's world transform. */
    transform = _init_transform(this, mat4.create());

    /** killCount (uint32_t) - EveSpaceObject2::GetParentData never assigns it,
     * so it stays zero through that path (EveSpaceObject2.cpp:1874). */
    killCount = (_init_extra_transform(this), _init_killCount(this, 0));

    /** shipData (Vector4) - m_spaceObjectShipData. */
    shipData = (_init_extra_killCount(this), _init_shipData(this, vec4.create()));

    /** clipSphereCenter (Vector3). */
    clipSphereCenter = (_init_extra_shipData(this), _init_clipSphereCenter(this, vec3.create()));

    /** clipRadiusSq (float). */
    clipRadiusSq = (_init_extra_clipSphereCenter(this), _init_clipRadiusSq(this, 0));

    /** clipRadius2Sq (float). */
    clipRadius2Sq = (_init_extra_clipRadiusSq(this), _init_clipRadius2Sq(this, 0));

    /** clipFactor (float) - the parent's clipSphereFactor. */
    clipFactor = (_init_extra_clipRadius2Sq(this), _init_clipFactor(this, 0));

    /** clipFactor2 (float) - the parent's clipSphereFactor2. */
    clipFactor2 = (_init_extra_clipFactor(this), _init_clipFactor2(this, 0));

    /** customData (Vector4). */
    customData = (_init_extra_clipFactor2(this), _init_customData(this, vec4.create()));

    /**
     * shLighting (const Vector4*) - Carbon borrows a pointer to the parent's
     * seven packed spherical-harmonic coefficients and copies them at fill time,
     * zeroing when the pointer is null (EveSpaceObjectDecal.cpp:376-383). The
     * port holds the parent's array by reference with the same null contract; it
     * is runtime state, so it carries no persistence.
     */
    shLighting = (_init_extra_customData(this), null);

    /** Carbon's packed spherical-harmonic coefficient count
     * (Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT). */
  }];
  SH_COEFFICIENT_COUNT = 7;
  constructor() {
    super(_IEveSpaceObject2Pare), _initClass();
  }
}();

export { _IEveSpaceObject2Pare as IEveSpaceObject2ParentData };
//# sourceMappingURL=IEveSpaceObject2ParentData.js.map
