import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_areas, _init_extra_areas;

/** Tr2MaterialMesh (resources) - maintained from schema shapeHash 3e7dff83.... */
let _Tr2MaterialMesh;
class Tr2MaterialMesh extends CjsModel {
  static {
    ({
      e: [_init_areas, _init_extra_areas],
      c: [_Tr2MaterialMesh, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2MaterialMesh",
      family: "resources"
    })], [[[io, io.persist, void 0, type.objectRef("Tr2MaterialAreaDict")], 16, "areas"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_areas(this);
  }
  /** m_areas (PTr2MaterialAreaDict) [READ, PERSIST] */
  areas = _init_areas(this, null);
  static {
    _initClass();
  }
}

export { _Tr2MaterialMesh as Tr2MaterialMesh };
//# sourceMappingURL=Tr2MaterialMesh.js.map
