import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsLightData as _CjsLightData } from '../../lights/CjsLightData.js';

let _initClass, _init_lightData, _init_extra_lightData, _init_boneMatrix, _init_extra_boneMatrix, _init_lightProfile, _init_extra_lightProfile, _init_boosterGainInfluence, _init_extra_boosterGainInfluence, _init_index, _init_extra_index, _init_lightProfilePath, _init_extra_lightProfilePath;
let _EveSpotlightLight;
class EveSpotlightLight extends CjsModel {
  static {
    ({
      e: [_init_lightData, _init_extra_lightData, _init_boneMatrix, _init_extra_boneMatrix, _init_lightProfile, _init_extra_lightProfile, _init_boosterGainInfluence, _init_extra_boosterGainInfluence, _init_index, _init_extra_index, _init_lightProfilePath, _init_extra_lightProfilePath],
      c: [_EveSpotlightLight, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSpotlightLight",
      family: "eve/attachment/spotlights"
    })], [[[io, io.owned, void 0, type.struct("CjsLightData")], 16, "lightData"], [[type, type.mat4], 16, "boneMatrix"], [type.objectRef("Tr2LightProfileRes"), 0, "lightProfile"], [[type, type.boolean], 16, "boosterGainInfluence"], [[type, type.uint32], 16, "index"], [[type, type.string], 16, "lightProfilePath"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lightProfilePath(this);
  }
  lightData = _init_lightData(this, new _CjsLightData());
  boneMatrix = (_init_extra_lightData(this), _init_boneMatrix(this, mat4.create()));
  lightProfile = (_init_extra_boneMatrix(this), _init_lightProfile(this, null));
  boosterGainInfluence = (_init_extra_lightProfile(this), _init_boosterGainInfluence(this, false));
  index = (_init_extra_boosterGainInfluence(this), _init_index(this, 0));
  lightProfilePath = (_init_extra_index(this), _init_lightProfilePath(this, ""));
  static FromSOF(value) {
    const values = value ?? {};
    return _EveSpotlightLight.from({
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    });
  }
  static {
    _initClass();
  }
}

export { _EveSpotlightLight as EveSpotlightLight };
//# sourceMappingURL=EveSpotlightLight.js.map
