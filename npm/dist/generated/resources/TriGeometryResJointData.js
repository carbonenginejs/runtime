import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { mat4 } from '@carbonenginejs/core-math/mat4';

let _initClass, _init_name, _init_extra_name, _init_parentJoint, _init_extra_parentJoint, _init_inverseWorldTransform, _init_extra_inverseWorldTransform;

/** TriGeometryResJointData (resources) - generated from schema shapeHash 9b31acb5.... */
let _TriGeometryResJointD;
class TriGeometryResJointData extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_parentJoint, _init_extra_parentJoint, _init_inverseWorldTransform, _init_extra_inverseWorldTransform],
      c: [_TriGeometryResJointD, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriGeometryResJointData",
      family: "resources"
    })], [[[type, type.string], 16, "name"], [[type, type.uint32], 16, "parentJoint"], [[type, type.mat4], 16, "inverseWorldTransform"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_inverseWorldTransform(this);
  }
  /** m_name (std::string) */
  name = _init_name(this, "");

  /** m_parentJoint (unsigned int) */
  parentJoint = (_init_extra_name(this), _init_parentJoint(this, 0));

  /** m_inverseWorldTransform (Matrix) */
  inverseWorldTransform = (_init_extra_parentJoint(this), _init_inverseWorldTransform(this, mat4.create()));
  static {
    _initClass();
  }
}

export { _TriGeometryResJointD as TriGeometryResJointData };
//# sourceMappingURL=TriGeometryResJointData.js.map
