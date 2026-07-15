import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_meshes, _init_extra_meshes, _init_name, _init_extra_name;

/** Tr2MaterialRes (resources) - generated from schema shapeHash 11f97051.... */
let _Tr2MaterialRes;
class Tr2MaterialRes extends CjsModel {
  static {
    ({
      e: [_init_meshes, _init_extra_meshes, _init_name, _init_extra_name],
      c: [_Tr2MaterialRes, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2MaterialRes",
      family: "resources"
    })], [[[io, io.persist, void 0, type.objectRef("Tr2MaterialMeshDict")], 16, "meshes"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_meshes (PTr2MaterialMeshDict) [READ, PERSIST] */
  meshes = _init_meshes(this, null);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_meshes(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2MaterialRes as Tr2MaterialRes };
//# sourceMappingURL=Tr2MaterialRes.js.map
