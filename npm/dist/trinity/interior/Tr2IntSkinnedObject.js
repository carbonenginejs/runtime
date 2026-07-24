import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2SkinnedObject as _Tr2SkinnedObject } from '../trinityCore/Tr2SkinnedObject.js';

let _initProto, _initClass, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_depthOffset, _init_extra_depthOffset, _init_variableStore, _init_extra_variableStore;

/** Tr2IntSkinnedObject (interior) - generated from schema shapeHash fd82f335.... */
let _Tr2IntSkinnedObject;
class Tr2IntSkinnedObject extends _Tr2SkinnedObject {
  static {
    ({
      e: [_init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_depthOffset, _init_extra_depthOffset, _init_variableStore, _init_extra_variableStore, _initProto],
      c: [_Tr2IntSkinnedObject, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2IntSkinnedObject",
      family: "interior"
    })], [[[io, io.read, type, type.float32], 16, "boundingSphereRadius"], [[io, io.persist, type, type.float32], 16, "depthOffset"], [[io, io.read, void 0, type.objectRef("Tr2VariableStore")], 16, "variableStore"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Settles the owner through its cooperative proxy-identity synchronization hook.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The cooperative JS mutation hook receives an options bag rather than a Be::Var field handle.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetLOD"]], 0, void 0, _Tr2SkinnedObject));
  }
  constructor(...args) {
    super(...args);
    _init_extra_variableStore(this);
  }
  /** m_boundingSphere[3] (float) [READ] */
  boundingSphereRadius = (_initProto(this), _init_boundingSphereRadius(this, 0));

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  depthOffset = (_init_extra_boundingSphereRadius(this), _init_depthOffset(this, 0));

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  variableStore = (_init_extra_depthOffset(this), _init_variableStore(this, null));

  /** Carbon IInitialize hook populates the owner's LOD proxies. */
  Initialize() {
    this.OnModified();
    return true;
  }

  /** Carbon INotify hook delegates to Tr2SkinnedObject and accepts all changes. */
  OnModified(options = {}) {
    super.OnModified(options);
    return true;
  }

  /** Carbon override delegates LOD selection to Tr2SkinnedObject. */
  SetLOD(frustum) {
    return super.SetLOD(frustum);
  }
  static {
    _initClass();
  }
}

export { _Tr2IntSkinnedObject as Tr2IntSkinnedObject };
//# sourceMappingURL=Tr2IntSkinnedObject.js.map
