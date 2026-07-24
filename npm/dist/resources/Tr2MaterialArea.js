import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_material, _init_extra_material, _init_metatype, _init_extra_metatype;

/** Tr2MaterialArea (resources) - maintained from schema shapeHash a260b867.... */
let _Tr2MaterialArea;
class Tr2MaterialArea extends CjsModel {
  static {
    ({
      e: [_init_material, _init_extra_material, _init_metatype, _init_extra_metatype],
      c: [_Tr2MaterialArea, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2MaterialArea",
      family: "resources"
    })], [[[io, io.persist, void 0, type.objectRef("Tr2MaterialParameterStore")], 16, "material"], [[io, io.persist, type, type.string], 16, "metatype"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_metatype(this);
  }
  /** m_material (Tr2MaterialParameterStorePtr) [READWRITE, PERSIST] */
  material = _init_material(this, null);

  /** m_metaType (std::string) [READWRITE, PERSIST] */
  metatype = (_init_extra_material(this), _init_metatype(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2MaterialArea as Tr2MaterialArea };
//# sourceMappingURL=Tr2MaterialArea.js.map
