import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { IEveSOFDataHullExtensionPlacementDistribution as _IEveSOFDataHullExten } from './IEveSOFDataHullExtensionPlacementDistribution.js';

let _initClass, _init_displayFilter, _init_extra_displayFilter, _init_name, _init_extra_name;

/** EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings (eve) - generated from schema shapeHash 2142ba6f.... */
let _EveSOFDataHullExtens;
new class extends _identity {
  static [class EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings extends _IEveSOFDataHullExten {
    static {
      ({
        e: [_init_displayFilter, _init_extra_displayFilter, _init_name, _init_extra_name],
        c: [_EveSOFDataHullExtens, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("DisplayQualityModifier")], 16, "displayFilter"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, _IEveSOFDataHullExten));
    }
    constructor(...args) {
      super(...args);
      _init_extra_name(this);
    }
    /** m_displayFilter (DisplayQualityModifier - enum DisplayQualityModifier) [READWRITE, PERSIST, ENUM] */
    displayFilter = _init_displayFilter(this, 5);

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_displayFilter(this), _init_name(this, ""));
  }];
  DisplayQualityModifier = Object.freeze({
    ONLY_REFLECTIONS: 6,
    SHADER_ALL: 5,
    SHADER_HIGHMID: 3,
    SHADER_LOWMID: 1,
    SHADER_HIGH: 4,
    SHADER_MED: 2,
    SHADER_LOW: 0
  });
  constructor() {
    super(_EveSOFDataHullExtens), _initClass();
  }
}();

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings };
//# sourceMappingURL=EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.js.map
