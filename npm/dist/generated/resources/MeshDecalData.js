import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_indexBuffer, _init_extra_indexBuffer, _init_lodMask, _init_extra_lodMask, _init_lods, _init_extra_lods;

/** MeshDecalData (resources) - generated from schema shapeHash edd09cef.... */
let _MeshDecalData;
class MeshDecalData extends CjsModel {
  static {
    ({
      e: [_init_indexBuffer, _init_extra_indexBuffer, _init_lodMask, _init_extra_lodMask, _init_lods, _init_extra_lods],
      c: [_MeshDecalData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "MeshDecalData",
      family: "resources"
    })], [[type.rawStruct("Tr2SuballocatedBuffer::Allocation"), 0, "indexBuffer"], [[type, type.uint32], 16, "lodMask"], [type.list("MeshDecalLodData"), 0, "lods"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lods(this);
  }
  /** m_indexBuffer (Tr2SuballocatedBuffer::Allocation) */
  indexBuffer = _init_indexBuffer(this, null);

  /** m_lodMask (uint32_t) */
  lodMask = (_init_extra_indexBuffer(this), _init_lodMask(this, 0));

  /** m_lods (std::vector<MeshDecalLodData>) */
  lods = (_init_extra_lodMask(this), _init_lods(this, []));
  static {
    _initClass();
  }
}

export { _MeshDecalData as MeshDecalData };
//# sourceMappingURL=MeshDecalData.js.map
