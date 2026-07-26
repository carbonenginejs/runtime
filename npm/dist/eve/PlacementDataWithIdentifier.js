import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_initialTranslation, _init_extra_initialTranslation, _init_initialRotation, _init_extra_initialRotation, _init_initialScale, _init_extra_initialScale, _init_additionalTranslation, _init_extra_additionalTranslation, _init_translationFrameDelta, _init_extra_translationFrameDelta, _init_additionalRotation, _init_extra_additionalRotation, _init_additionalScale, _init_extra_additionalScale, _init_boneIndex, _init_extra_boneIndex, _init_lifeTime, _init_extra_lifeTime, _init_uniqueID, _init_extra_uniqueID, _init_initialPlacementID, _init_extra_initialPlacementID;

/**
 * One generated placement in a distribution: the initial transform the generator
 * produced, the extra translation, rotation and scale the attribute modifiers
 * have accumulated, and the identity and lifetime that let those modifiers
 * recognise the same placement between frames.
 */
let _PlacementDataWithIde;
class PlacementDataWithIdentifier extends CjsModel {
  static {
    ({
      e: [_init_initialTranslation, _init_extra_initialTranslation, _init_initialRotation, _init_extra_initialRotation, _init_initialScale, _init_extra_initialScale, _init_additionalTranslation, _init_extra_additionalTranslation, _init_translationFrameDelta, _init_extra_translationFrameDelta, _init_additionalRotation, _init_extra_additionalRotation, _init_additionalScale, _init_extra_additionalScale, _init_boneIndex, _init_extra_boneIndex, _init_lifeTime, _init_extra_lifeTime, _init_uniqueID, _init_extra_uniqueID, _init_initialPlacementID, _init_extra_initialPlacementID],
      c: [_PlacementDataWithIde, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "PlacementDataWithIdentifier",
      family: "eve/distribution/attributeModifiers"
    })], [[[type, type.vec3], 16, "initialTranslation"], [[type, type.quat], 16, "initialRotation"], [[type, type.vec3], 16, "initialScale"], [[type, type.vec3], 16, "additionalTranslation"], [[type, type.vec3], 16, "translationFrameDelta"], [[type, type.quat], 16, "additionalRotation"], [[type, type.vec3], 16, "additionalScale"], [[type, type.int32], 16, "boneIndex"], [[type, type.float32], 16, "lifeTime"], [[type, type.uint32], 16, "uniqueID"], [[type, type.int32], 16, "initialPlacementID"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_initialPlacementID(this);
  }
  initialTranslation = _init_initialTranslation(this, vec3.create());
  initialRotation = (_init_extra_initialTranslation(this), _init_initialRotation(this, quat.create()));
  initialScale = (_init_extra_initialRotation(this), _init_initialScale(this, vec3.fromValues(1, 1, 1)));
  additionalTranslation = (_init_extra_initialScale(this), _init_additionalTranslation(this, vec3.create()));
  translationFrameDelta = (_init_extra_additionalTranslation(this), _init_translationFrameDelta(this, vec3.create()));
  additionalRotation = (_init_extra_translationFrameDelta(this), _init_additionalRotation(this, quat.create()));
  additionalScale = (_init_extra_additionalRotation(this), _init_additionalScale(this, vec3.fromValues(1, 1, 1)));
  boneIndex = (_init_extra_additionalScale(this), _init_boneIndex(this, -1));
  lifeTime = (_init_extra_boneIndex(this), _init_lifeTime(this, 0));
  uniqueID = (_init_extra_lifeTime(this), _init_uniqueID(this, 0));
  initialPlacementID = (_init_extra_uniqueID(this), _init_initialPlacementID(this, -1));
  static {
    _initClass();
  }
}

export { _PlacementDataWithIde as PlacementDataWithIdentifier };
//# sourceMappingURL=PlacementDataWithIdentifier.js.map
