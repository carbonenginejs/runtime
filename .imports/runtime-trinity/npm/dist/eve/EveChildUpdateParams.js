import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_spaceObjectParent, _init_extra_spaceObjectParent, _init_childParent, _init_extra_childParent, _init_boneCount, _init_extra_boneCount, _init_bones, _init_extra_bones, _init_ownerMaxSpeed, _init_extra_ownerMaxSpeed, _init_activationStrength, _init_extra_activationStrength, _init_controllerUpdateFrequency, _init_extra_controllerUpdateFrequency, _init_isVisible, _init_extra_isVisible, _init_localToWorldTransform, _init_extra_localToWorldTransform, _init_worldVelocity, _init_extra_worldVelocity;

/**
 * The parameter block a parent passes down when updating a space-object child:
 * the parent references, the parent's bone array, the child's world placement,
 * and the owner's motion and activation state. Rebuilt by the parent for each
 * child update, so nothing in it survives the call.
 */
let _EveChildUpdateParams;
class EveChildUpdateParams extends CjsModel {
  static {
    ({
      e: [_init_spaceObjectParent, _init_extra_spaceObjectParent, _init_childParent, _init_extra_childParent, _init_boneCount, _init_extra_boneCount, _init_bones, _init_extra_bones, _init_ownerMaxSpeed, _init_extra_ownerMaxSpeed, _init_activationStrength, _init_extra_activationStrength, _init_controllerUpdateFrequency, _init_extra_controllerUpdateFrequency, _init_isVisible, _init_extra_isVisible, _init_localToWorldTransform, _init_extra_localToWorldTransform, _init_worldVelocity, _init_extra_worldVelocity],
      c: [_EveChildUpdateParams, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildUpdateParams",
      family: "eve/child"
    })], [[type.objectRef("IEveSpaceObject2"), 0, "spaceObjectParent"], [type.objectRef("IEveSpaceObjectChild"), 0, "childParent"], [[type, type.uint64], 16, "boneCount"], [type.objectRef("Float4x3"), 0, "bones"], [[type, type.float32], 16, "ownerMaxSpeed"], [[type, type.float32], 16, "activationStrength"], [[type, type.float32], 16, "controllerUpdateFrequency"], [[type, type.boolean], 16, "isVisible"], [[type, type.mat4], 16, "localToWorldTransform"], [[type, type.vec3], 16, "worldVelocity"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_worldVelocity(this);
  }
  spaceObjectParent = _init_spaceObjectParent(this, null);
  childParent = (_init_extra_spaceObjectParent(this), _init_childParent(this, null));
  boneCount = (_init_extra_childParent(this), _init_boneCount(this, 0));
  bones = (_init_extra_boneCount(this), _init_bones(this, null));
  ownerMaxSpeed = (_init_extra_bones(this), _init_ownerMaxSpeed(this, 0));
  activationStrength = (_init_extra_ownerMaxSpeed(this), _init_activationStrength(this, 1));
  controllerUpdateFrequency = (_init_extra_activationStrength(this), _init_controllerUpdateFrequency(this, 0.5));
  isVisible = (_init_extra_controllerUpdateFrequency(this), _init_isVisible(this, true));
  localToWorldTransform = (_init_extra_isVisible(this), _init_localToWorldTransform(this, mat4.create()));
  worldVelocity = (_init_extra_localToWorldTransform(this), _init_worldVelocity(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _EveChildUpdateParams as EveChildUpdateParams };
//# sourceMappingURL=EveChildUpdateParams.js.map
