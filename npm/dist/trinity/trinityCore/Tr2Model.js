import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initProto, _initClass, _init_meshes, _init_extra_meshes, _init_name, _init_extra_name;

/** Tr2Model (trinityCore) - generated from schema shapeHash f0e9beb8.... */
let _Tr2Model;
class Tr2Model extends CjsModel {
  static {
    ({
      e: [_init_meshes, _init_extra_meshes, _init_name, _init_extra_name, _initProto],
      c: [_Tr2Model, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Model",
      family: "trinityCore"
    })], [[[io, io.persist, void 0, type.list("Tr2Mesh")], 16, "meshes"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBoundingBoxInLocalSpace"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_meshes (PTr2MeshVector) [READ, PERSIST] */
  meshes = (_initProto(this), _init_meshes(this, []));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_meshes(this), _init_name(this, ""));

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  GetBoundingBoxInLocalSpace(...args) {
    throw new Error("Tr2Model.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2Model as Tr2Model };
//# sourceMappingURL=Tr2Model.js.map
