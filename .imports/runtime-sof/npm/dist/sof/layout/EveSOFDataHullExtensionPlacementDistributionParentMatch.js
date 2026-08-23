import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { EveSOFDNADescriptor as _EveSOFDNADescriptor } from '../shared/EveSOFDNADescriptor.js';
import { IEveSOFDataHullExtensionPlacementDistribution as _IEveSOFDataHullExten } from './IEveSOFDataHullExtensionPlacementDistribution.js';

let _initClass, _init_parentDescriptor, _init_extra_parentDescriptor, _init_name, _init_extra_name;

/** EveSOFDataHullExtensionPlacementDistributionParentMatch (eve) - generated from schema shapeHash 2afff7b6.... */
let _EveSOFDataHullExtens;
class EveSOFDataHullExtensionPlacementDistributionParentMatch extends _IEveSOFDataHullExten {
  static {
    ({
      e: [_init_parentDescriptor, _init_extra_parentDescriptor, _init_name, _init_extra_name],
      c: [_EveSOFDataHullExtens, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullExtensionPlacementDistributionParentMatch",
      family: "eve"
    })], [[[io, io.persist, void 0, type.objectRef("EveSOFDNADescriptor")], 16, "parentDescriptor"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, _IEveSOFDataHullExten));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_parentDescriptor (EveSOFDNADescriptorPtr) [READWRITE, PERSIST] */
  parentDescriptor = _init_parentDescriptor(this, new _EveSOFDNADescriptor());

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_parentDescriptor(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionPlacementDistributionParentMatch };
//# sourceMappingURL=EveSOFDataHullExtensionPlacementDistributionParentMatch.js.map
