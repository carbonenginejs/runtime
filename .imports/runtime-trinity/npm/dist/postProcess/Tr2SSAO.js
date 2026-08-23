import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { SSAOQuality } from '../generated/trinityCore/enums.js';

let _initProto, _initClass, _init_quality, _init_extra_quality, _init_cortaoBentNormal, _init_extra_cortaoBentNormal, _init_zoomLevel, _init_extra_zoomLevel, _init_shadowClamp, _init_extra_shadowClamp, _init_shadowPower, _init_extra_shadowPower, _init_shadowMultiplier, _init_extra_shadowMultiplier, _init_cortaoBlur, _init_extra_cortaoBlur, _init_cortaoEnabled, _init_extra_cortaoEnabled, _init_sharpness, _init_extra_sharpness, _init_enabled, _init_extra_enabled, _init_cortaoMipBias, _init_extra_cortaoMipBias, _init_cortaoMaxBlockerSearchRadius, _init_extra_cortaoMaxBlockerSearchRadius, _init_cortaoRadius, _init_extra_cortaoRadius, _init_cortaoStrength, _init_extra_cortaoStrength, _init_downsampled, _init_extra_downsampled, _init_radius, _init_extra_radius;

/**
 * Carbon's authored SSAO settings and quality controls.
 *
 * Physical CACAO/CORTAO allocation, compute dispatch, and filtering remain an
 * explicit engine obligation.
 */
let _Tr2SSAO;
new class extends _identity {
  static [class Tr2SSAO extends CjsModel {
    static {
      ({
        e: [_init_quality, _init_extra_quality, _init_cortaoBentNormal, _init_extra_cortaoBentNormal, _init_zoomLevel, _init_extra_zoomLevel, _init_shadowClamp, _init_extra_shadowClamp, _init_shadowPower, _init_extra_shadowPower, _init_shadowMultiplier, _init_extra_shadowMultiplier, _init_cortaoBlur, _init_extra_cortaoBlur, _init_cortaoEnabled, _init_extra_cortaoEnabled, _init_sharpness, _init_extra_sharpness, _init_enabled, _init_extra_enabled, _init_cortaoMipBias, _init_extra_cortaoMipBias, _init_cortaoMaxBlockerSearchRadius, _init_extra_cortaoMaxBlockerSearchRadius, _init_cortaoRadius, _init_extra_cortaoRadius, _init_cortaoStrength, _init_extra_cortaoStrength, _init_downsampled, _init_extra_downsampled, _init_radius, _init_extra_radius, _initProto],
        c: [_Tr2SSAO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2SSAO",
        family: "trinityCore"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("SSAOQuality")], 16, "quality"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "cortaoBentNormal"], [[io, io.persist, type, type.float32], 16, "zoomLevel"], [[io, io.persist, type, type.float32], 16, "shadowClamp"], [[io, io.persist, type, type.float32], 16, "shadowPower"], [[io, io.persist, type, type.float32], 16, "shadowMultiplier"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "cortaoBlur"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "cortaoEnabled"], [[io, io.persist, type, type.float32], 16, "sharpness"], [[io, io.readwrite, type, type.boolean], 16, "enabled"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoMipBias"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoMaxBlockerSearchRadius"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoRadius"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoStrength"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "downsampled"], [[io, io.persist, type, type.float32], 16, "radius"], [[carbon, carbon.method, impl, impl.implemented], 18, "Enable"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetQuality"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Filter"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_radius(this);
    }
    quality = (_initProto(this), _init_quality(this, SSAOQuality.HIGHEST));
    cortaoBentNormal = (_init_extra_quality(this), _init_cortaoBentNormal(this, true));
    zoomLevel = (_init_extra_cortaoBentNormal(this), _init_zoomLevel(this, 5));
    shadowClamp = (_init_extra_zoomLevel(this), _init_shadowClamp(this, 0.98));
    shadowPower = (_init_extra_shadowClamp(this), _init_shadowPower(this, 2.6));
    shadowMultiplier = (_init_extra_shadowPower(this), _init_shadowMultiplier(this, 1));
    cortaoBlur = (_init_extra_shadowMultiplier(this), _init_cortaoBlur(this, true));
    cortaoEnabled = (_init_extra_cortaoBlur(this), _init_cortaoEnabled(this, true));
    sharpness = (_init_extra_cortaoEnabled(this), _init_sharpness(this, 0.5));
    enabled = (_init_extra_sharpness(this), _init_enabled(this, true));
    cortaoMipBias = (_init_extra_enabled(this), _init_cortaoMipBias(this, -4));
    cortaoMaxBlockerSearchRadius = (_init_extra_cortaoMipBias(this), _init_cortaoMaxBlockerSearchRadius(this, 0.25));
    cortaoRadius = (_init_extra_cortaoMaxBlockerSearchRadius(this), _init_cortaoRadius(this, 1e10));
    cortaoStrength = (_init_extra_cortaoRadius(this), _init_cortaoStrength(this, 1));
    downsampled = (_init_extra_cortaoStrength(this), _init_downsampled(this, false));
    radius = (_init_extra_downsampled(this), _init_radius(this, 6));

    /** Enables or disables Carbon's detail SSAO layer. */
    Enable(enable) {
      this.enabled = Boolean(enable);
    }

    /** Selects the detail-layer quality and resolution policy. */
    SetQuality(quality, downsampled) {
      this.quality = quality;
      this.downsampled = Boolean(downsampled);
    }

    /**
     * Filters the supplied depth/normal inputs into a physical SSAO texture.
     *
     * @throws {Error} Until an engine-owned realization contract is installed.
     */
    Filter(_depthBuffer, _normalBuffer, _gpuResourcePool, _renderContext, _temporal) {
      throw new Error("Tr2SSAO.Filter requires an engine-owned SSAO realization contract");
    }
  }];
  SSAOQuality = SSAOQuality;
  constructor() {
    super(_Tr2SSAO), _initClass();
  }
}();

export { _Tr2SSAO as Tr2SSAO };
//# sourceMappingURL=Tr2SSAO.js.map
