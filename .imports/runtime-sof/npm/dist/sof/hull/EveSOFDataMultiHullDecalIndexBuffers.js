import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_indexBuffers, _init_extra_indexBuffers, _init_combinedGeometryResPath, _init_extra_combinedGeometryResPath;

/** EveSOFDataMultiHullDecalIndexBuffers (eve) - generated from schema shapeHash 6887aa5b.... */
let _EveSOFDataMultiHullD;
class EveSOFDataMultiHullDecalIndexBuffers extends CjsModel {
  static {
    ({
      e: [_init_indexBuffers, _init_extra_indexBuffers, _init_combinedGeometryResPath, _init_extra_combinedGeometryResPath],
      c: [_EveSOFDataMultiHullD, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataMultiHullDecalIndexBuffers",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataDecalIndexBuffer")], 16, "indexBuffers"], [[io, io.persist, type, type.string], 16, "combinedGeometryResPath"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_combinedGeometryResPath(this);
  }
  /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
  indexBuffers = _init_indexBuffers(this, []);

  /** m_combinedGeometryResPath (std::string) [READWRITE, PERSIST] */
  combinedGeometryResPath = (_init_extra_indexBuffers(this), _init_combinedGeometryResPath(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataMultiHullD as EveSOFDataMultiHullDecalIndexBuffers };
//# sourceMappingURL=EveSOFDataMultiHullDecalIndexBuffers.js.map
