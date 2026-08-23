import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_parent, _init_extra_parent, _init_name, _init_extra_name, _init_parentPath, _init_extra_parentPath, _init_parameters, _init_extra_parameters;

/** Tr2MaterialParameterStore (trinityCore) - generated from schema shapeHash 119f32c2.... */
let _Tr2MaterialParameter;
class Tr2MaterialParameterStore extends CjsModel {
  static {
    ({
      e: [_init_parent, _init_extra_parent, _init_name, _init_extra_name, _init_parentPath, _init_extra_parentPath, _init_parameters, _init_extra_parameters, _initProto],
      c: [_Tr2MaterialParameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2MaterialParameterStore",
      family: "trinityCore"
    })], [[[io, io.read, void 0, type.objectRef("Tr2MaterialParameterStore")], 16, "parent"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.path], 16, "parentPath"], [[io, io.persist, void 0, type.map("ITriEffectParameter")], 16, "parameters"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindParameter"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_parameters(this);
  }
  /** m_parentStore (Tr2MaterialParameterStorePtr) [READ] */
  parent = (_initProto(this), _init_parent(this, null));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_parent(this), _init_name(this, ""));

  /** m_parentPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  parentPath = (_init_extra_name(this), _init_parentPath(this, ""));

  /** m_parameters (PITriEffectParameterDict) [READ, PERSIST] */
  parameters = (_init_extra_parentPath(this), _init_parameters(this, new Map()));

  /**
   * Looks a parameter up in this store and then walks the parent chain; null
   * when no store in the chain defines it.
   */
  FindParameter(name) {
    let currentStore = this;
    while (currentStore) {
      const parameter = currentStore.parameters.get(name);
      if (parameter !== undefined) {
        return parameter;
      }
      currentStore = currentStore.parent;
    }
    return null;
  }
  static {
    _initClass();
  }
}

export { _Tr2MaterialParameter as Tr2MaterialParameterStore };
//# sourceMappingURL=Tr2MaterialParameterStore.js.map
