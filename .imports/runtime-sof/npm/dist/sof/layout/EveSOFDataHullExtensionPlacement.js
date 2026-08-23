import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { IEveSOFDataHullExtensionPlacement as _IEveSOFDataHullExten } from './IEveSOFDataHullExtensionPlacement.js';
import { EveSOFDNADescriptor as _EveSOFDNADescriptor } from '../shared/EveSOFDNADescriptor.js';
import { EveSOFDataHullExtensionPlacementDistributionPlacement as _EveSOFDataHullExtens$1 } from './EveSOFDataHullExtensionPlacementDistributionPlacement.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_distributionConditions, _init_extra_distributionConditions, _init_extendsBoundingSphere, _init_extra_extendsBoundingSphere, _init_extendsShieldEllipsoid, _init_extra_extendsShieldEllipsoid, _init_isShared, _init_extra_isShared, _init_isInstanced, _init_extra_isInstanced, _init_enabled, _init_extra_enabled, _init_distribution, _init_extra_distribution, _init_descriptor, _init_extra_descriptor, _init_locatorSetName, _init_extra_locatorSetName, _init_name, _init_extra_name, _init_offset, _init_extra_offset;

/** EveSOFDataHullExtensionPlacement (eve) - generated from schema shapeHash 9f4b8ceb.... */
let _EveSOFDataHullExtens;
class EveSOFDataHullExtensionPlacement extends _IEveSOFDataHullExten {
  static {
    ({
      e: [_init_distributionConditions, _init_extra_distributionConditions, _init_extendsBoundingSphere, _init_extra_extendsBoundingSphere, _init_extendsShieldEllipsoid, _init_extra_extendsShieldEllipsoid, _init_isShared, _init_extra_isShared, _init_isInstanced, _init_extra_isInstanced, _init_enabled, _init_extra_enabled, _init_distribution, _init_extra_distribution, _init_descriptor, _init_extra_descriptor, _init_locatorSetName, _init_extra_locatorSetName, _init_name, _init_extra_name, _init_offset, _init_extra_offset],
      c: [_EveSOFDataHullExtens, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullExtensionPlacement",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("IEveSOFDataHullExtensionPlacementDistribution")], 16, "distributionConditions"], [[io, io.persist, type, type.boolean], 16, "extendsBoundingSphere"], [[io, io.persist, type, type.boolean], 16, "extendsShieldEllipsoid"], [[io, io.persist, type, type.boolean], 16, "isShared"], [[io, io.persist, type, type.boolean], 16, "isInstanced"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, void 0, type.objectRef("EveSOFDataHullExtensionPlacementDistributionPlacement")], 16, "distribution"], [[io, io.persist, void 0, type.objectRef("EveSOFDNADescriptor")], 16, "descriptor"], [[io, io.persist, type, type.string], 16, "locatorSetName"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "offset"]], 0, void 0, _IEveSOFDataHullExten));
  }
  constructor(...args) {
    super(...args);
    _init_extra_offset(this);
  }
  /** m_distributionConditions (PIEveSOFDataHullExtensionPlacementDistributionVector) [READ, PERSIST] */
  distributionConditions = _init_distributionConditions(this, []);

  /** m_extendsBoundingSphere (bool) [READWRITE, PERSIST] */
  extendsBoundingSphere = (_init_extra_distributionConditions(this), _init_extendsBoundingSphere(this, true));

  /** m_extendsShieldEllipsoid (bool) [READWRITE, PERSIST] */
  extendsShieldEllipsoid = (_init_extra_extendsBoundingSphere(this), _init_extendsShieldEllipsoid(this, true));

  /** m_isShared (bool) [READWRITE, PERSIST] */
  isShared = (_init_extra_extendsShieldEllipsoid(this), _init_isShared(this, false));

  /** m_isInstanced (bool) [READWRITE, PERSIST] */
  isInstanced = (_init_extra_isShared(this), _init_isInstanced(this, true));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_isInstanced(this), _init_enabled(this, true));

  /** m_distribution (EveSOFDataHullExtensionPlacementDistributionPlacementPtr) [READWRITE, PERSIST] */
  distribution = (_init_extra_enabled(this), _init_distribution(this, new _EveSOFDataHullExtens$1()));

  /** m_descriptor (EveSOFDNADescriptorPtr) [READWRITE, PERSIST] */
  descriptor = (_init_extra_distribution(this), _init_descriptor(this, new _EveSOFDNADescriptor()));

  /** m_locatorSetName (std::string) [READWRITE, PERSIST] */
  locatorSetName = (_init_extra_descriptor(this), _init_locatorSetName(this, ""));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_locatorSetName(this), _init_name(this, ""));

  /** m_offset (Vector3) [READWRITE, PERSIST] */
  offset = (_init_extra_name(this), _init_offset(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionPlacement };
//# sourceMappingURL=EveSOFDataHullExtensionPlacement.js.map
