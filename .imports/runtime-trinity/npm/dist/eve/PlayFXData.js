import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_effectPlaying, _init_extra_effectPlaying, _init_droneArrived, _init_extra_droneArrived, _init_oldTarget, _init_extra_oldTarget;

/**
 * Per-agent scratch for the PlayFX child behaviour: whether the agent's effect
 * is currently running and the target position it was last aimed at. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
let _PlayFXData;
class PlayFXData extends CjsModel {
  static {
    ({
      e: [_init_effectPlaying, _init_extra_effectPlaying, _init_droneArrived, _init_extra_droneArrived, _init_oldTarget, _init_extra_oldTarget],
      c: [_PlayFXData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "PlayFXData",
      family: "eve/child/behaviors"
    })], [[[type, type.boolean], 16, "effectPlaying"], [[type, type.boolean], 16, "droneArrived"], [[type, type.vec3], 16, "oldTarget"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_oldTarget(this);
  }
  effectPlaying = _init_effectPlaying(this, false);
  droneArrived = (_init_extra_effectPlaying(this), _init_droneArrived(this, false));
  oldTarget = (_init_extra_droneArrived(this), _init_oldTarget(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _PlayFXData as PlayFXData };
//# sourceMappingURL=PlayFXData.js.map
