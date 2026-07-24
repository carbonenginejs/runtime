import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_name, _init_extra_name, _init_firstIndex, _init_extra_firstIndex, _init_primitiveCount, _init_extra_primitiveCount, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds, _init_jointBindings, _init_extra_jointBindings, _init_staticBlas, _init_extra_staticBlas, _init_isSkinned, _init_extra_isSkinned, _init_isMorphed, _init_extra_isMorphed, _init_rtGeometryConstants, _init_extra_rtGeometryConstants;

/** TriGeometryResAreaData (resources) - maintained from schema shapeHash a859a2c5.... */
let _TriGeometryResAreaDa;
class TriGeometryResAreaData extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_firstIndex, _init_extra_firstIndex, _init_primitiveCount, _init_extra_primitiveCount, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds, _init_jointBindings, _init_extra_jointBindings, _init_staticBlas, _init_extra_staticBlas, _init_isSkinned, _init_extra_isSkinned, _init_isMorphed, _init_extra_isMorphed, _init_rtGeometryConstants, _init_extra_rtGeometryConstants],
      c: [_TriGeometryResAreaDa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriGeometryResAreaData",
      family: "resources"
    })], [[[type, type.string], 16, "name"], [[type, type.int32], 16, "firstIndex"], [[type, type.int32], 16, "primitiveCount"], [[type, type.vec3], 16, "minBounds"], [[type, type.vec3], 16, "maxBounds"], [[type, type.unknown], 16, "jointBindings"], [type.rawStruct("Tr2RtBottomLevelAccelerationStructureAL"), 0, "staticBlas"], [[type, type.boolean], 16, "isSkinned"], [[type, type.boolean], 16, "isMorphed"], [type.rawStruct("Tr2ConstantBufferAL"), 0, "rtGeometryConstants"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_rtGeometryConstants(this);
  }
  /** m_name (std::string) */
  name = _init_name(this, "");

  /** m_firstIndex (int) */
  firstIndex = (_init_extra_name(this), _init_firstIndex(this, 0));

  /** m_primitiveCount (int) */
  primitiveCount = (_init_extra_firstIndex(this), _init_primitiveCount(this, 0));

  /** m_minBounds (Vector3) */
  minBounds = (_init_extra_primitiveCount(this), _init_minBounds(this, vec3.create()));

  /** m_maxBounds (Vector3) */
  maxBounds = (_init_extra_minBounds(this), _init_maxBounds(this, vec3.create()));

  /** m_jointBindings (TrackableStdVector<int>) */
  jointBindings = (_init_extra_maxBounds(this), _init_jointBindings(this, null));

  /** m_staticBlas (Tr2RtBottomLevelAccelerationStructureAL) */
  staticBlas = (_init_extra_jointBindings(this), _init_staticBlas(this, null));

  /** m_isSkinned (bool) */
  isSkinned = (_init_extra_staticBlas(this), _init_isSkinned(this, false));

  /** m_isMorphed (bool) */
  isMorphed = (_init_extra_isSkinned(this), _init_isMorphed(this, false));

  /** m_rtGeometryConstants (Tr2ConstantBufferAL) */
  rtGeometryConstants = (_init_extra_isMorphed(this), _init_rtGeometryConstants(this, null));
  static {
    _initClass();
  }
}

export { _TriGeometryResAreaDa as TriGeometryResAreaData };
//# sourceMappingURL=TriGeometryResAreaData.js.map
