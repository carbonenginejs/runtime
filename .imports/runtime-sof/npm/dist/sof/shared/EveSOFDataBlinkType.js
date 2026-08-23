import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_Blink, _init_extra_Blink, _init_FadeIn, _init_extra_FadeIn, _init_FadeOut, _init_extra_FadeOut, _init_Cycle, _init_extra_Cycle;

/** EveSOFDataBlinkType (eve) - generated from schema shapeHash db502493.... */
let _EveSOFDataBlinkType;
new class extends _identity {
  static [class EveSOFDataBlinkType extends CjsModel {
    static {
      ({
        e: [_init_Blink, _init_extra_Blink, _init_FadeIn, _init_extra_FadeIn, _init_FadeOut, _init_extra_FadeOut, _init_Cycle, _init_extra_Cycle],
        c: [_EveSOFDataBlinkType, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataBlinkType",
        family: "eve"
      })], [[[io, io.persist, void 0, type.objectRef("EveSOFDataBlink")], 16, "Blink"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBlink")], 16, "FadeIn"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBlink")], 16, "FadeOut"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBlink")], 16, "Cycle"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_Cycle(this);
    }
    /** m_blinkType[TYPE_BLINK] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
    Blink = _init_Blink(this, null);

    /** m_blinkType[TYPE_FADE_IN] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
    FadeIn = (_init_extra_Blink(this), _init_FadeIn(this, null));

    /** m_blinkType[TYPE_FADE_OUT] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
    FadeOut = (_init_extra_FadeIn(this), _init_FadeOut(this, null));

    /** m_blinkType[TYPE_CYCLE] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
    Cycle = (_init_extra_FadeOut(this), _init_Cycle(this, null));

    /** Gets blink data by Carbon enum value; TYPE_STATIC has no data record. */
    GetByType(blinkType) {
      const property = this.constructor.Types[blinkType];
      return property ? this[property] ?? null : null;
    }
  }];
  Type = Object.freeze({
    STATIC: 0,
    BLINK: 1,
    FADE_IN: 2,
    FADE_OUT: 3,
    CYCLE: 4
  });
  Types = Object.freeze([null, "Blink", "FadeIn", "FadeOut", "Cycle"]);
  constructor() {
    super(_EveSOFDataBlinkType), _initClass();
  }
}();

export { _EveSOFDataBlinkType as EveSOFDataBlinkType };
//# sourceMappingURL=EveSOFDataBlinkType.js.map
