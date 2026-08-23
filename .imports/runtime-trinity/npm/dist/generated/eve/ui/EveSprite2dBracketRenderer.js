import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_iconAtlas, _init_extra_iconAtlas, _init_brackets, _init_extra_brackets;

/** EveSprite2dBracketRenderer (eve/ui) - generated from schema shapeHash eebbf21e.... */
let _EveSprite2dBracketRe;
class EveSprite2dBracketRenderer extends CjsModel {
  static {
    ({
      e: [_init_iconAtlas, _init_extra_iconAtlas, _init_brackets, _init_extra_brackets],
      c: [_EveSprite2dBracketRe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSprite2dBracketRenderer",
      family: "eve/ui"
    })], [[[io, io.readwrite, void 0, type.objectRef("Tr2AtlasTexture")], 16, "iconAtlas"], [[io, io.read, void 0, type.list("EveSprite2dBracket")], 16, "brackets"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_brackets(this);
  }
  /** m_iconAtlas (Tr2AtlasTexturePtr) [READWRITE] */
  iconAtlas = _init_iconAtlas(this, null);

  /** m_brackets (PEveSprite2dBracketVector) [READ] */
  brackets = (_init_extra_iconAtlas(this), _init_brackets(this, []));
  static {
    _initClass();
  }
}

export { _EveSprite2dBracketRe as EveSprite2dBracketRenderer };
//# sourceMappingURL=EveSprite2dBracketRenderer.js.map
