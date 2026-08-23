import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_passes, _init_extra_passes, _init_libraries, _init_extra_libraries;

/** Tr2EffectTechniqueInputs (shader) - generated from schema shapeHash 6ea72a37.... */
let _Tr2EffectTechniqueIn;
class Tr2EffectTechniqueInputs extends CjsModel {
  static {
    ({
      e: [_init_passes, _init_extra_passes, _init_libraries, _init_extra_libraries],
      c: [_Tr2EffectTechniqueIn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectTechniqueInputs",
      family: "shader"
    })], [[type.list("Tr2EffectPassParameters"), 0, "passes"], [type.list("Tr2EffectLibraryParameters"), 0, "libraries"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_libraries(this);
  }
  /** passes (std::vector<std::unique_ptr<Tr2EffectPassParameters>>) */
  passes = _init_passes(this, []);

  /** libraries (std::vector<std::unique_ptr<Tr2EffectLibraryParameters>>) */
  libraries = (_init_extra_passes(this), _init_libraries(this, []));
  static {
    _initClass();
  }
}

export { _Tr2EffectTechniqueIn as Tr2EffectTechniqueInputs };
//# sourceMappingURL=Tr2EffectTechniqueInputs.js.map
