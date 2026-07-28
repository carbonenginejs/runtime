import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_boosterIntensity, _init_extra_boosterIntensity, _init_trailIntensity, _init_extra_trailIntensity, _init_warpIntensity, _init_extra_warpIntensity, _init_padding, _init_extra_padding;

/**
 * Carbon `EveBoosterSetPerObjectData::PixelShaderData` - the trail intensities.
 *
 * `boosterIntensity` is declared on BOTH stages in Carbon; it is not a
 * duplicate to be collapsed. The producer writes it separately for each
 * (EveBoosterSet2Renderable.js:335 for the vertex stage, :339 for this one).
 */
let _EveBoosterSetPSData;
class EveBoosterSetPSData extends CjsModel {
  static {
    ({
      e: [_init_boosterIntensity, _init_extra_boosterIntensity, _init_trailIntensity, _init_extra_trailIntensity, _init_warpIntensity, _init_extra_warpIntensity, _init_padding, _init_extra_padding],
      c: [_EveBoosterSetPSData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveBoosterSetPSData",
      family: "eve/attachment/boosters"
    })], [[[type, type.float32], 16, "boosterIntensity"], [[type, type.float32], 16, "trailIntensity"], [[type, type.float32], 16, "warpIntensity"], [[type, type.float32], 16, "padding2"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_padding(this);
  }
  /** boosterIntensity (float) */
  boosterIntensity = _init_boosterIntensity(this, 0);

  /** trailIntensity (float) */
  trailIntensity = (_init_extra_boosterIntensity(this), _init_trailIntensity(this, 0));

  /** warpIntensity (float) */
  warpIntensity = (_init_extra_trailIntensity(this), _init_warpIntensity(this, 0));

  /** padding2 (float) - Carbon's explicit register pad; never written. */
  padding2 = (_init_extra_warpIntensity(this), _init_padding(this, 0));
  static {
    _initClass();
  }
}

export { _EveBoosterSetPSData as EveBoosterSetPSData };
//# sourceMappingURL=EveBoosterSetPSData.js.map
