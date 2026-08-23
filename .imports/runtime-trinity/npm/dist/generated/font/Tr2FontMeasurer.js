import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_ascender, _init_extra_ascender, _init_cursorX, _init_extra_cursorX, _init_cursorY, _init_extra_cursorY, _init_descender, _init_extra_descender, _init_letterSpace, _init_extra_letterSpace, _init_limit, _init_extra_limit, _init_asc, _init_extra_asc, _init_des, _init_extra_des, _init_underline, _init_extra_underline;

/** Tr2FontMeasurer (font) - generated from schema shapeHash 55a0402b.... */
let _Tr2FontMeasurer;
class Tr2FontMeasurer extends CjsModel {
  static {
    ({
      e: [_init_ascender, _init_extra_ascender, _init_cursorX, _init_extra_cursorX, _init_cursorY, _init_extra_cursorY, _init_descender, _init_extra_descender, _init_letterSpace, _init_extra_letterSpace, _init_limit, _init_extra_limit, _init_asc, _init_extra_asc, _init_des, _init_extra_des, _init_underline, _init_extra_underline, _initProto],
      c: [_Tr2FontMeasurer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2FontMeasurer",
      family: "font"
    })], [[[io, io.readwrite, type, type.int32], 16, "ascender"], [[io, io.readwrite, type, type.int32], 16, "cursorX"], [[io, io.readwrite, type, type.int32], 16, "cursorY"], [[io, io.readwrite, type, type.int32], 16, "descender"], [[io, io.readwrite, type, type.int32], 16, "letterSpace"], [[io, io.readwrite, type, type.int32], 16, "limit"], [[io, io.readwrite, type, type.int32], 16, "asc"], [[io, io.readwrite, type, type.int32], 16, "des"], [[io, io.readwrite, type, type.boolean], 16, "underline"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CancelLastText"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CommitText"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "DrawToAtlasTexture"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "DrawToHostBitmap"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "DrawToTexture"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "HasCommittedText"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "HasUncommittedText"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetIndexAtPos"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "AddText"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetWidthAtIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_underline(this);
  }
  /** m_ascender (int) [READWRITE] */
  ascender = (_initProto(this), _init_ascender(this, 0));

  /** m_cursorX (int) [READWRITE] */
  cursorX = (_init_extra_ascender(this), _init_cursorX(this, 0));

  /** m_cursorY (int) [READWRITE] */
  cursorY = (_init_extra_cursorX(this), _init_cursorY(this, 0));

  /** m_descender (int) [READWRITE] */
  descender = (_init_extra_cursorY(this), _init_descender(this, 0));

  /** m_letterSpace (int) [READWRITE] */
  letterSpace = (_init_extra_descender(this), _init_letterSpace(this, 1));

  /** m_limit (int) [READWRITE] */
  limit = (_init_extra_letterSpace(this), _init_limit(this, 0));

  /** m_ascender (int) [READWRITE] */
  asc = (_init_extra_limit(this), _init_asc(this, 0));

  /** m_descender (int) [READWRITE] */
  des = (_init_extra_asc(this), _init_des(this, 0));

  /** m_underline (bool) [READWRITE] */
  underline = (_init_extra_des(this), _init_underline(this, false));

  /** Carbon method CancelLastText (MAP_METHOD_AND_WRAP). */
  CancelLastText(...args) {
    throw new Error("Tr2FontMeasurer.CancelLastText is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CommitText (MAP_METHOD_AND_WRAP). */
  CommitText(...args) {
    throw new Error("Tr2FontMeasurer.CommitText is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DrawToAtlasTexture (MAP_METHOD_AND_WRAP). */
  DrawToAtlasTexture(...args) {
    throw new Error("Tr2FontMeasurer.DrawToAtlasTexture is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DrawToHostBitmap (MAP_METHOD_AND_WRAP). */
  DrawToHostBitmap(...args) {
    throw new Error("Tr2FontMeasurer.DrawToHostBitmap is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DrawToTexture (MAP_METHOD_AND_WRAP). */
  DrawToTexture(...args) {
    throw new Error("Tr2FontMeasurer.DrawToTexture is not implemented in CarbonEngineJS.");
  }

  /** Carbon method HasCommittedText (MAP_METHOD_AND_WRAP). */
  HasCommittedText(...args) {
    throw new Error("Tr2FontMeasurer.HasCommittedText is not implemented in CarbonEngineJS.");
  }

  /** Carbon method HasUncommittedText (MAP_METHOD_AND_WRAP). */
  HasUncommittedText(...args) {
    throw new Error("Tr2FontMeasurer.HasUncommittedText is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetIndexAtPos (MAP_METHOD_AND_WRAP). */
  GetIndexAtPos(...args) {
    throw new Error("Tr2FontMeasurer.GetIndexAtPos is not implemented in CarbonEngineJS.");
  }

  /** Carbon method AddText (MAP_METHOD_AND_WRAP). */
  AddText(...args) {
    throw new Error("Tr2FontMeasurer.AddText is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Reset (MAP_METHOD_AND_WRAP). */
  Reset(...args) {
    throw new Error("Tr2FontMeasurer.Reset is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetWidthAtIndex (MAP_METHOD_AND_WRAP). */
  GetWidthAtIndex(...args) {
    throw new Error("Tr2FontMeasurer.GetWidthAtIndex is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2FontMeasurer as Tr2FontMeasurer };
//# sourceMappingURL=Tr2FontMeasurer.js.map
