import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_material, _init_extra_material, _init_metatype, _init_extra_metatype;

/**
 * Associates one material-area metatype with its persisted parameter store.
 *
 * The record describes resource data and does not own shader bindings or
 * backend material realization.
 */
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
  /** Persisted material parameter-store reference. */
  material = _init_material(this, null);

  /** Authored material-area metatype. */
  metatype = (_init_extra_material(this), _init_metatype(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2MaterialArea as Tr2MaterialArea };
//# sourceMappingURL=Tr2MaterialArea.js.map
