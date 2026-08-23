import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_sourceName, _init_extra_sourceName, _init_sourceValue, _init_extra_sourceValue, _init_registerIndex, _init_extra_registerIndex, _init_registerCount, _init_extra_registerCount;

/** Tr2EffectParam (shader) - generated from schema shapeHash fdbc3137.... */
let _Tr2EffectParam;
class Tr2EffectParam extends CjsModel {
  static {
    ({
      e: [_init_sourceName, _init_extra_sourceName, _init_sourceValue, _init_extra_sourceValue, _init_registerIndex, _init_extra_registerIndex, _init_registerCount, _init_extra_registerCount],
      c: [_Tr2EffectParam, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectParam",
      family: "shader"
    })], [[[type, type.string], 16, "sourceName"], [type.objectRef("ITr2EffectValue"), 0, "sourceValue"], [[type, type.uint32], 16, "registerIndex"], [[type, type.uint32], 16, "registerCount"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_registerCount(this);
  }
  /** m_sourceName (std::string) */
  sourceName = _init_sourceName(this, "");

  /** m_sourceValue (ITr2EffectValuePtr) */
  sourceValue = (_init_extra_sourceName(this), _init_sourceValue(this, null));

  /** m_registerIndex (unsigned int) */
  registerIndex = (_init_extra_sourceValue(this), _init_registerIndex(this, 0));

  /** m_registerCount (unsigned int) */
  registerCount = (_init_extra_registerIndex(this), _init_registerCount(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2EffectParam as Tr2EffectParam };
//# sourceMappingURL=Tr2EffectParam.js.map
