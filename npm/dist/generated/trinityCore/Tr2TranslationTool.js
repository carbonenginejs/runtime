import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2ManipulationTool as _Tr2ManipulationTool } from '../../trinityCore/Tr2ManipulationTool.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_translation, _init_extra_translation;

/** Tr2TranslationTool (trinityCore) - generated from schema shapeHash 696038f5.... */
let _Tr2TranslationTool;
class Tr2TranslationTool extends _Tr2ManipulationTool {
  static {
    ({
      e: [_init_translation, _init_extra_translation],
      c: [_Tr2TranslationTool, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TranslationTool",
      family: "trinityCore"
    })], [[[io, io.read, type, type.vec3], 16, "translation"]], 0, void 0, _Tr2ManipulationTool));
  }
  constructor(...args) {
    super(...args);
    _init_extra_translation(this);
  }
  /** m_translation (Vector3) [READ] */
  translation = _init_translation(this, vec3.create());
  static {
    _initClass();
  }
}

export { _Tr2TranslationTool as Tr2TranslationTool };
//# sourceMappingURL=Tr2TranslationTool.js.map
