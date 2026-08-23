import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_tunnelID, _init_extra_tunnelID, _init_tunnelGroupType, _init_extra_tunnelGroupType, _init_splinePoints, _init_extra_splinePoints, _init_cylWidth, _init_extra_cylWidth, _init_accelerationMultiplier, _init_extra_accelerationMultiplier, _init_pullSize, _init_extra_pullSize, _init_pointOfNoReturnSize, _init_extra_pointOfNoReturnSize;

/** SplineTunnel (eve/child/behaviors) - generated from schema shapeHash d53f1701.... */
let _SplineTunnel;
class SplineTunnel extends CjsModel {
  static {
    ({
      e: [_init_tunnelID, _init_extra_tunnelID, _init_tunnelGroupType, _init_extra_tunnelGroupType, _init_splinePoints, _init_extra_splinePoints, _init_cylWidth, _init_extra_cylWidth, _init_accelerationMultiplier, _init_extra_accelerationMultiplier, _init_pullSize, _init_extra_pullSize, _init_pointOfNoReturnSize, _init_extra_pointOfNoReturnSize],
      c: [_SplineTunnel, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SplineTunnel",
      family: "eve"
    })], [[[type, type.int32], 16, "tunnelID"], [[type, type.int32], 16, "tunnelGroupType"], [type.list("SplineTunnelPoint"), 0, "splinePoints"], [[type, type.float32], 16, "cylWidth"], [[type, type.float32], 16, "accelerationMultiplier"], [[type, type.float32], 16, "pullSize"], [[type, type.float32], 16, "pointOfNoReturnSize"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_pointOfNoReturnSize(this);
  }
  /** tunnelID (int) */
  tunnelID = _init_tunnelID(this, -1);

  /** tunnelGroupType (int) */
  tunnelGroupType = (_init_extra_tunnelID(this), _init_tunnelGroupType(this, 0));

  /** splinePoints (std::vector<SplineTunnelPoint>) */
  splinePoints = (_init_extra_tunnelGroupType(this), _init_splinePoints(this, []));

  /** cylWidth (float) */
  cylWidth = (_init_extra_splinePoints(this), _init_cylWidth(this, 20));

  /** accelerationMultiplier (float) */
  // Carbon leaves this unused native member uninitialized. The portable
  // record uses the multiplicative identity as a deterministic value.
  accelerationMultiplier = (_init_extra_cylWidth(this), _init_accelerationMultiplier(this, 1));

  /** pullSize (float) */
  pullSize = (_init_extra_accelerationMultiplier(this), _init_pullSize(this, 50));

  /** pointOfNoReturnSize (float) */
  pointOfNoReturnSize = (_init_extra_pullSize(this), _init_pointOfNoReturnSize(this, 20));
  static {
    _initClass();
  }
}

export { _SplineTunnel as SplineTunnel };
//# sourceMappingURL=SplineTunnel.js.map
