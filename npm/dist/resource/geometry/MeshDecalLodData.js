import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_startIndex, _init_extra_startIndex, _init_primitiveCount, _init_extra_primitiveCount;

/** MeshDecalLodData (resources) - maintained from schema shapeHash 932b2966.... */
let _MeshDecalLodData;
class MeshDecalLodData extends CjsModel {
  static {
    ({
      e: [_init_startIndex, _init_extra_startIndex, _init_primitiveCount, _init_extra_primitiveCount],
      c: [_MeshDecalLodData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "MeshDecalLodData",
      family: "resources"
    })], [[[type, type.uint32], 16, "startIndex"], [[type, type.uint32], 16, "primitiveCount"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_primitiveCount(this);
  }
  /** m_startIndex (uint32_t) */
  startIndex = _init_startIndex(this, 0);

  /** m_primitiveCount (uint32_t) */
  primitiveCount = (_init_extra_startIndex(this), _init_primitiveCount(this, 0));
  static {
    _initClass();
  }
}

export { _MeshDecalLodData as MeshDecalLodData };
//# sourceMappingURL=MeshDecalLodData.js.map
