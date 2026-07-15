import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_resourceLoadCbId, _init_extra_resourceLoadCbId, _init_resourcePrepCbId, _init_extra_resourcePrepCbId, _init_reached, _init_extra_reached;

/** Tr2LoadPrepareFence (resources) - generated from schema shapeHash ff002907.... */
let _Tr2LoadPrepareFence;
class Tr2LoadPrepareFence extends CjsModel {
  static {
    ({
      e: [_init_resourceLoadCbId, _init_extra_resourceLoadCbId, _init_resourcePrepCbId, _init_extra_resourcePrepCbId, _init_reached, _init_extra_reached],
      c: [_Tr2LoadPrepareFence, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2LoadPrepareFence",
      family: "resources"
    })], [[[type, type.unknown], 16, "resourceLoadCbId"], [[type, type.unknown], 16, "resourcePrepCbId"], [[type, type.boolean], 16, "reached"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_reached(this);
  }
  /** m_resourceLoadCbId (CcpAtomic<uint32_t>) */
  resourceLoadCbId = _init_resourceLoadCbId(this, 0);

  /** m_resourcePrepCbId (CcpAtomic<uint32_t>) */
  resourcePrepCbId = (_init_extra_resourceLoadCbId(this), _init_resourcePrepCbId(this, 0));

  /** m_reached (bool) */
  reached = (_init_extra_resourcePrepCbId(this), _init_reached(this, true));
  static {
    _initClass();
  }
}

export { _Tr2LoadPrepareFence as Tr2LoadPrepareFence };
//# sourceMappingURL=Tr2LoadPrepareFence.js.map
