import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { TriDebugFont } from '../include/enums.js';

let _initClass, _init_font, _init_extra_font, _init_text, _init_extra_text, _init_display, _init_extra_display, _init_position, _init_extra_position;

/** Tr2PrimitiveText (trinityCore) - generated from schema shapeHash 9b6c5ad5.... */
let _Tr2PrimitiveText;
new class extends _identity {
  static [class Tr2PrimitiveText extends CjsModel {
    static {
      ({
        e: [_init_font, _init_extra_font, _init_text, _init_extra_text, _init_display, _init_extra_display, _init_position, _init_extra_position],
        c: [_Tr2PrimitiveText, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PrimitiveText",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("TriDebugFont")], 16, "font"], [[io, io.persist, type, type.string], 16, "text"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.vec3], 16, "position"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_position(this);
    }
    /** m_font (TriDebugFont - enum TriDebugFont) [READWRITE, PERSIST, ENUM] */
    font = _init_font(this, 0);

    /** m_text (std::string) [READWRITE, PERSIST] */
    text = (_init_extra_font(this), _init_text(this, ""));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_text(this), _init_display(this, true));

    /** m_position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_display(this), _init_position(this, vec3.create()));
  }];
  TriDebugFont = TriDebugFont;
  constructor() {
    super(_Tr2PrimitiveText), _initClass();
  }
}();

export { _Tr2PrimitiveText as Tr2PrimitiveText };
//# sourceMappingURL=Tr2PrimitiveText.js.map
