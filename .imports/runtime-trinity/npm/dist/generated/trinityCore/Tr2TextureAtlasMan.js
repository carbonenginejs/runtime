import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_atlases, _init_extra_atlases;

/** Tr2TextureAtlasMan (trinityCore) - generated from schema shapeHash eb1502a3.... */
let _Tr2TextureAtlasMan;
class Tr2TextureAtlasMan extends CjsModel {
  static {
    ({
      e: [_init_atlases, _init_extra_atlases, _initProto],
      c: [_Tr2TextureAtlasMan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TextureAtlasMan",
      family: "trinityCore"
    })], [[[io, io.read, void 0, type.objectRef("Tr2TextureAtlasVectorRO")], 16, "atlases"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "AddAtlas"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RemoveAtlas"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_atlases(this);
  }
  /** m_atlases (PTr2TextureAtlasVectorRO) [READ] */
  atlases = (_initProto(this), _init_atlases(this, null));

  /** Carbon method AddAtlas -> AddAtlasWrap (MAP_METHOD_AND_WRAP). */
  AddAtlas(...args) {
    throw new Error("Tr2TextureAtlasMan.AddAtlas is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RemoveAtlas -> RemoveAtlasWrap (MAP_METHOD_AND_WRAP). */
  RemoveAtlas(...args) {
    throw new Error("Tr2TextureAtlasMan.RemoveAtlas is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2TextureAtlasMan as Tr2TextureAtlasMan };
//# sourceMappingURL=Tr2TextureAtlasMan.js.map
