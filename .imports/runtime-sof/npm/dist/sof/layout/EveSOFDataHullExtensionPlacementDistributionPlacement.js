import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_randomScaleMin, _init_extra_randomScaleMin, _init_randomScaleMax, _init_extra_randomScaleMax, _init_centerBias, _init_extra_centerBias, _init_cap, _init_extra_cap, _init_completeness, _init_extra_completeness, _init_randomRotationMaxSteps, _init_extra_randomRotationMaxSteps, _init_randomRotationStepSizeYPR, _init_extra_randomRotationStepSizeYPR, _init_placementBias, _init_extra_placementBias, _init_occupyLocators, _init_extra_occupyLocators, _init_uniformScale, _init_extra_uniformScale;

/** EveSOFDataHullExtensionPlacementDistributionPlacement (eve) - generated from schema shapeHash 1cff41f5.... */
// Carbon derives this record directly from IRoot with its own m_name
// (EveSOFData.h:1999-2021); it is NOT a distribution condition, despite the
// name - the distribution conditions implement the separate BLUE_INTERFACE.
let _EveSOFDataHullExtens;
class EveSOFDataHullExtensionPlacementDistributionPlacement extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_randomScaleMin, _init_extra_randomScaleMin, _init_randomScaleMax, _init_extra_randomScaleMax, _init_centerBias, _init_extra_centerBias, _init_cap, _init_extra_cap, _init_completeness, _init_extra_completeness, _init_randomRotationMaxSteps, _init_extra_randomRotationMaxSteps, _init_randomRotationStepSizeYPR, _init_extra_randomRotationStepSizeYPR, _init_placementBias, _init_extra_placementBias, _init_occupyLocators, _init_extra_occupyLocators, _init_uniformScale, _init_extra_uniformScale],
      c: [_EveSOFDataHullExtens, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullExtensionPlacementDistributionPlacement",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "randomScaleMin"], [[io, io.persist, type, type.vec3], 16, "randomScaleMax"], [[io, io.persist, type, type.float32], 16, "centerBias"], [[io, io.persist, type, type.int32], 16, "cap"], [[io, io.persist, type, type.float32], 16, "completeness"], [[io, io.persist, type, type.vec3], 16, "randomRotationMaxSteps"], [[io, io.persist, type, type.quat], 16, "randomRotationStepSizeYPR"], [[io, io.persist, type, type.vec3], 16, "placementBias"], [[io, io.persist, type, type.boolean], 16, "occupyLocators"], [[io, io.persist, type, type.boolean], 16, "uniformScale"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_uniformScale(this);
  }
  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_randomScaleMin (Vector3) [READWRITE, PERSIST] */
  randomScaleMin = (_init_extra_name(this), _init_randomScaleMin(this, vec3.fromValues(1, 1, 1)));

  /** m_randomScaleMax (Vector3) [READWRITE, PERSIST] */
  randomScaleMax = (_init_extra_randomScaleMin(this), _init_randomScaleMax(this, vec3.fromValues(1, 1, 1)));

  /** m_centerBias (float) [READWRITE, PERSIST] */
  centerBias = (_init_extra_randomScaleMax(this), _init_centerBias(this, 0));

  /** m_cap (int32_t) [READWRITE, PERSIST] */
  cap = (_init_extra_centerBias(this), _init_cap(this, 0));

  /** m_completeness (float) [READWRITE, PERSIST] */
  completeness = (_init_extra_cap(this), _init_completeness(this, 1));

  /** m_randomRotationMaxSteps (Vector3) [READWRITE, PERSIST] */
  randomRotationMaxSteps = (_init_extra_completeness(this), _init_randomRotationMaxSteps(this, vec3.create()));

  /** m_randomRotationStepSizeYPR (Quaternion) [READWRITE, PERSIST] */
  randomRotationStepSizeYPR = (_init_extra_randomRotationMaxSteps(this), _init_randomRotationStepSizeYPR(this, quat.fromValues(0.008802, 0.0086497, 0.0086497, 0.9998864)));

  /** m_placementBias (Vector3) [READWRITE, PERSIST] */
  placementBias = (_init_extra_randomRotationStepSizeYPR(this), _init_placementBias(this, vec3.create()));

  /** m_occupyLocators (bool) [READWRITE, PERSIST] */
  occupyLocators = (_init_extra_placementBias(this), _init_occupyLocators(this, true));

  /** m_uniformScale (bool) [READWRITE, PERSIST] */
  uniformScale = (_init_extra_occupyLocators(this), _init_uniformScale(this, true));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionPlacementDistributionPlacement };
//# sourceMappingURL=EveSOFDataHullExtensionPlacementDistributionPlacement.js.map
