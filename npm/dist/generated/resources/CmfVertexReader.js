import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_posElem, _init_extra_posElem, _init_normElem, _init_extra_normElem, _init_tanElem, _init_extra_tanElem, _init_binormElem, _init_extra_binormElem, _init_pkdTanElem, _init_extra_pkdTanElem, _init_pkdLegElem, _init_extra_pkdLegElem;

/** CmfVertexReader (resources) - generated from schema shapeHash b28887e3.... */
let _CmfVertexReader;
class CmfVertexReader extends CjsModel {
  static {
    ({
      e: [_init_posElem, _init_extra_posElem, _init_normElem, _init_extra_normElem, _init_tanElem, _init_extra_tanElem, _init_binormElem, _init_extra_binormElem, _init_pkdTanElem, _init_extra_pkdTanElem, _init_pkdLegElem, _init_extra_pkdLegElem],
      c: [_CmfVertexReader, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CmfVertexReader",
      family: "resources"
    })], [[type.objectRef("cmf::VertexElement"), 0, "posElem"], [type.objectRef("cmf::VertexElement"), 0, "normElem"], [type.objectRef("cmf::VertexElement"), 0, "tanElem"], [type.objectRef("cmf::VertexElement"), 0, "binormElem"], [type.objectRef("cmf::VertexElement"), 0, "pkdTanElem"], [type.objectRef("cmf::VertexElement"), 0, "pkdLegElem"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_pkdLegElem(this);
  }
  /** posElem (cmf::VertexElement*) */
  posElem = _init_posElem(this, null);

  /** normElem (cmf::VertexElement*) */
  normElem = (_init_extra_posElem(this), _init_normElem(this, null));

  /** tanElem (cmf::VertexElement*) */
  tanElem = (_init_extra_normElem(this), _init_tanElem(this, null));

  /** binormElem (cmf::VertexElement*) */
  binormElem = (_init_extra_tanElem(this), _init_binormElem(this, null));

  /** pkdTanElem (cmf::VertexElement*) */
  pkdTanElem = (_init_extra_binormElem(this), _init_pkdTanElem(this, null));

  /** pkdLegElem (cmf::VertexElement*) */
  pkdLegElem = (_init_extra_pkdTanElem(this), _init_pkdLegElem(this, null));
  static {
    _initClass();
  }
}

export { _CmfVertexReader as CmfVertexReader };
//# sourceMappingURL=CmfVertexReader.js.map
