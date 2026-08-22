import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Light as _Tr2Light } from '../lights/Tr2Light.js';
import { EveSmartLightPointLight as _EveSmartLightPointLi } from './EveSmartLightPointLight.js';

let _initProto, _initClass, _init_innerAngle, _init_extra_innerAngle, _init_outerAngle, _init_extra_outerAngle;

/** A spot-light specialization with persisted cone angles. */
let _EveSmartLightSpotLig;
new class extends _identity {
  static [class EveSmartLightSpotLight extends _EveSmartLightPointLi {
    static {
      ({
        e: [_init_innerAngle, _init_extra_innerAngle, _init_outerAngle, _init_extra_outerAngle, _initProto],
        c: [_EveSmartLightSpotLig, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSmartLightSpotLight",
        family: "eve/smartLights"
      })], [[[io, io.persist, type, type.float32], 16, "innerAngle"], [[io, io.persist, type, type.float32], 16, "outerAngle"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RenderDebugInfo"]], 0, void 0, _EveSmartLightPointLi));
    }
    /** m_lightGroupData.innerAngle (float) [READWRITE, PERSIST] */
    innerAngle = (_initProto(this), _init_innerAngle(this, 0));

    /** m_lightGroupData.outerAngle (float) [READWRITE, PERSIST] */
    outerAngle = (_init_extra_innerAngle(this), _init_outerAngle(this, 0));

    /** m_lightType override - the constructor's only job (EveSmartLightSpotLight.cpp:7-11). */
    lightType = (_init_extra_outerAngle(this), _Tr2Light.SPOT_LIGHT);

    /** Carbon method RenderDebugInfo (EveSmartLightSpotLight.cpp:13-56). */
    RenderDebugInfo(..._args) {
      throw new Error("EveSmartLightSpotLight.RenderDebugInfo is not implemented in CarbonEngineJS.");
    }
  }];
  LightDataFields = [..._EveSmartLightPointLi.LightDataFields, "innerAngle", "outerAngle"];
  constructor() {
    super(_EveSmartLightSpotLig), _initClass();
  }
}();

export { _EveSmartLightSpotLig as EveSmartLightSpotLight };
//# sourceMappingURL=EveSmartLightSpotLight.js.map
