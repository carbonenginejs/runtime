import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_quality, _init_extra_quality, _init_cortaoBentNormal, _init_extra_cortaoBentNormal, _init_zoomLevel, _init_extra_zoomLevel, _init_shadowClamp, _init_extra_shadowClamp, _init_shadowPower, _init_extra_shadowPower, _init_shadowMultiplier, _init_extra_shadowMultiplier, _init_cortaoBlur, _init_extra_cortaoBlur, _init_cortaoEnabled, _init_extra_cortaoEnabled, _init_sharpness, _init_extra_sharpness, _init_enabled, _init_extra_enabled, _init_cortaoMipBias, _init_extra_cortaoMipBias, _init_cortaoMaxBlockerSearchRadius, _init_extra_cortaoMaxBlockerSearchRadius, _init_cortaoRadius, _init_extra_cortaoRadius, _init_cortaoStrength, _init_extra_cortaoStrength, _init_downsampled, _init_extra_downsampled, _init_radius, _init_extra_radius;

/** Tr2SSAO (trinityCore) - generated from schema shapeHash e4c570f7.... */
let _Tr2SSAO;
new class extends _identity {
  static [class Tr2SSAO extends CjsModel {
    static {
      ({
        e: [_init_quality, _init_extra_quality, _init_cortaoBentNormal, _init_extra_cortaoBentNormal, _init_zoomLevel, _init_extra_zoomLevel, _init_shadowClamp, _init_extra_shadowClamp, _init_shadowPower, _init_extra_shadowPower, _init_shadowMultiplier, _init_extra_shadowMultiplier, _init_cortaoBlur, _init_extra_cortaoBlur, _init_cortaoEnabled, _init_extra_cortaoEnabled, _init_sharpness, _init_extra_sharpness, _init_enabled, _init_extra_enabled, _init_cortaoMipBias, _init_extra_cortaoMipBias, _init_cortaoMaxBlockerSearchRadius, _init_extra_cortaoMaxBlockerSearchRadius, _init_cortaoRadius, _init_extra_cortaoRadius, _init_cortaoStrength, _init_extra_cortaoStrength, _init_downsampled, _init_extra_downsampled, _init_radius, _init_extra_radius],
        c: [_Tr2SSAO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2SSAO",
        family: "trinityCore"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("SSAOQuality")], 16, "quality"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "cortaoBentNormal"], [[io, io.persist, type, type.float32], 16, "zoomLevel"], [[io, io.persist, type, type.float32], 16, "shadowClamp"], [[io, io.persist, type, type.float32], 16, "shadowPower"], [[io, io.persist, type, type.float32], 16, "shadowMultiplier"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "cortaoBlur"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "cortaoEnabled"], [[io, io.persist, type, type.float32], 16, "sharpness"], [[io, io.readwrite, type, type.boolean], 16, "enabled"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoMipBias"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoMaxBlockerSearchRadius"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoRadius"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "cortaoStrength"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "downsampled"], [[io, io.persist, type, type.float32], 16, "radius"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_radius(this);
    }
    /** m_detail.quality (SSAOQuality - enum SSAOQuality) [READWRITE, NOTIFY, ENUM] */
    quality = _init_quality(this, 0);

    /** m_cortaoBentNormal (bool) [READWRITE, NOTIFY, PERSIST] */
    cortaoBentNormal = (_init_extra_quality(this), _init_cortaoBentNormal(this, true));

    /** m_detail.zoomLevel (float) [READWRITE, PERSIST] */
    zoomLevel = (_init_extra_cortaoBentNormal(this), _init_zoomLevel(this, 5));

    /** m_detail.settings.shadowClamp (Layer) [READWRITE, PERSIST] */
    shadowClamp = (_init_extra_zoomLevel(this), _init_shadowClamp(this, 0.98));

    /** m_detail.settings.shadowPower (Layer) [READWRITE, PERSIST] */
    shadowPower = (_init_extra_shadowClamp(this), _init_shadowPower(this, 2.6));

    /** m_detail.settings.shadowMultiplier (Layer) [READWRITE, PERSIST] */
    shadowMultiplier = (_init_extra_shadowPower(this), _init_shadowMultiplier(this, 1));

    /** m_cortaoBlur (bool) [READWRITE, NOTIFY] */
    cortaoBlur = (_init_extra_shadowMultiplier(this), _init_cortaoBlur(this, true));

    /** m_cortaoEnabled (bool) [READWRITE, NOTIFY, PERSIST] */
    cortaoEnabled = (_init_extra_cortaoBlur(this), _init_cortaoEnabled(this, true));

    /** m_detail.settings.sharpness (Layer) [READWRITE, PERSIST] */
    sharpness = (_init_extra_cortaoEnabled(this), _init_sharpness(this, 0.5));

    /** m_detail.enabled (bool) [READWRITE] */
    enabled = (_init_extra_sharpness(this), _init_enabled(this, true));

    /** m_cortaoMipBias (float) [READWRITE, NOTIFY] */
    cortaoMipBias = (_init_extra_enabled(this), _init_cortaoMipBias(this, -4));

    /** m_cortaoMaxBlockerSearchRadius (float) [READWRITE, NOTIFY] */
    cortaoMaxBlockerSearchRadius = (_init_extra_cortaoMipBias(this), _init_cortaoMaxBlockerSearchRadius(this, 0.25));

    /** m_cortaoRadius (float) [READWRITE, NOTIFY] */
    cortaoRadius = (_init_extra_cortaoMaxBlockerSearchRadius(this), _init_cortaoRadius(this, 1e10));

    /** m_cortaoStrength (float) [READWRITE, NOTIFY] */
    cortaoStrength = (_init_extra_cortaoRadius(this), _init_cortaoStrength(this, 1));

    /** m_detail.downsampled (bool) [READWRITE, NOTIFY] */
    downsampled = (_init_extra_cortaoStrength(this), _init_downsampled(this, false));

    /** m_detail.settings.radius (float) [READWRITE, PERSIST] */
    radius = (_init_extra_downsampled(this), _init_radius(this, 6));
  }];
  SSAOQuality = Object.freeze({
    HIGHEST: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    LOWEST: 4
  });
  constructor() {
    super(_Tr2SSAO), _initClass();
  }
}();

export { _Tr2SSAO as Tr2SSAO };
//# sourceMappingURL=Tr2SSAO.js.map
