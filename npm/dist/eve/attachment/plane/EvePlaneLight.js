import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsLightData as _CjsLightData } from '../../lights/CjsLightData.js';
import { FadeType } from '../EveSpaceObjectAttachmentUtils.js';

let _initClass, _init_lightData, _init_extra_lightData, _init_saturation, _init_extra_saturation, _init_lightProfile, _init_extra_lightProfile, _init_fadeType, _init_extra_fadeType, _init_blinkPhase, _init_extra_blinkPhase, _init_blinkRate, _init_extra_blinkRate, _init_index, _init_extra_index, _init_boneMatrix, _init_extra_boneMatrix, _init_lightProfilePath, _init_extra_lightProfilePath;

/**
 * The light one plane contributes, carrying its saturation, blink rate and
 * phase, fade type, light profile and the bone matrix resolved for it each
 * frame.
 */
let _EvePlaneLight;
new class extends _identity {
  static [class EvePlaneLight extends CjsModel {
    static {
      ({
        e: [_init_lightData, _init_extra_lightData, _init_saturation, _init_extra_saturation, _init_lightProfile, _init_extra_lightProfile, _init_fadeType, _init_extra_fadeType, _init_blinkPhase, _init_extra_blinkPhase, _init_blinkRate, _init_extra_blinkRate, _init_index, _init_extra_index, _init_boneMatrix, _init_extra_boneMatrix, _init_lightProfilePath, _init_extra_lightProfilePath],
        c: [_EvePlaneLight, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EvePlaneLight",
        family: "eve/attachment/planes"
      })], [[[io, io.owned, void 0, type.struct("CjsLightData")], 16, "lightData"], [[type, type.float32], 16, "saturation"], [type.objectRef("Tr2LightProfileRes"), 0, "lightProfile"], [[type, type.int32, void 0, type.enum("FadeType")], 16, "fadeType"], [[type, type.float32], 16, "blinkPhase"], [[type, type.float32], 16, "blinkRate"], [[type, type.uint32], 16, "index"], [[type, type.mat4], 16, "boneMatrix"], [[type, type.string], 16, "lightProfilePath"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_lightProfilePath(this);
    }
    lightData = _init_lightData(this, new _CjsLightData());
    saturation = (_init_extra_lightData(this), _init_saturation(this, 1));
    lightProfile = (_init_extra_saturation(this), _init_lightProfile(this, null));
    fadeType = (_init_extra_lightProfile(this), _init_fadeType(this, _EvePlaneLight.FT_NONE));
    blinkPhase = (_init_extra_fadeType(this), _init_blinkPhase(this, 0));
    blinkRate = (_init_extra_blinkPhase(this), _init_blinkRate(this, 0));
    index = (_init_extra_blinkRate(this), _init_index(this, 0));
    boneMatrix = (_init_extra_index(this), _init_boneMatrix(this, mat4.create()));
    lightProfilePath = (_init_extra_boneMatrix(this), _init_lightProfilePath(this, ""));

    /**
     * Builds a plane light from a SOF-authored description, taking the light
     * profile path from the description or, failing that, from the light data's
     * texture path.
     */
    static FromSOF(value) {
      const values = value ?? {};
      return _EvePlaneLight.from({
        ...values,
        lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
      });
    }
  }];
  FadeType = FadeType;
  FT_NONE = 0;
  FT_BLINK = 1;
  FT_FADEIN = 2;
  FT_FADEOUT = 3;
  FT_FADEINOUT = 4;
  constructor() {
    super(_EvePlaneLight), _initClass();
  }
}();

export { _EvePlaneLight as EvePlaneLight };
//# sourceMappingURL=EvePlaneLight.js.map
