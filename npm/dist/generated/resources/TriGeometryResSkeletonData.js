import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_name, _init_extra_name, _init_joints, _init_extra_joints;

/** TriGeometryResSkeletonData (resources) - generated from schema shapeHash 9cfcfdf1.... */
let _TriGeometryResSkelet;
class TriGeometryResSkeletonData extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_joints, _init_extra_joints],
      c: [_TriGeometryResSkelet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriGeometryResSkeletonData",
      family: "resources"
    })], [[[type, type.string], 16, "name"], [[type, type.unknown], 16, "joints"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_joints(this);
  }
  /** m_name (std::string) */
  name = _init_name(this, "");

  /** m_joints (TrackableStdVector<TriGeometryResJointData>) */
  joints = (_init_extra_name(this), _init_joints(this, null));
  static {
    _initClass();
  }
}

export { _TriGeometryResSkelet as TriGeometryResSkeletonData };
//# sourceMappingURL=TriGeometryResSkeletonData.js.map
