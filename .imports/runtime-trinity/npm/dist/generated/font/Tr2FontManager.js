import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_glyphCacheBudget, _init_extra_glyphCacheBudget, _init_loadFlag, _init_extra_loadFlag, _init_totalGlyphsCachedSize, _init_extra_totalGlyphsCachedSize;

/** Tr2FontManager (font) - generated from schema shapeHash 0e73b15b.... */
let _Tr2FontManager;
class Tr2FontManager extends CjsModel {
  static {
    ({
      e: [_init_glyphCacheBudget, _init_extra_glyphCacheBudget, _init_loadFlag, _init_extra_loadFlag, _init_totalGlyphsCachedSize, _init_extra_totalGlyphsCachedSize, _initProto],
      c: [_Tr2FontManager, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2FontManager",
      family: "font"
    })], [[[io, io.readwrite, type, type.uint64], 16, "glyphCacheBudget"], [[io, io.readwrite, type, type.int32], 16, "loadFlag"], [[io, io.read, type, type.uint64], 16, "totalGlyphsCachedSize"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ClearBuffer"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ClearCachedGlyphs"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "LookupGlyphIndex"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "LookupKerningXP"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "LookupMetrics"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "LookupSBit"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "TrimGlyphCache"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_totalGlyphsCachedSize(this);
  }
  /** m_glyphCacheBudget (size_t) [READWRITE] */
  glyphCacheBudget = (_initProto(this), _init_glyphCacheBudget(this, 524288));

  /** m_loadflag (int) [READWRITE] */
  loadFlag = (_init_extra_glyphCacheBudget(this), _init_loadFlag(this, 0));

  /** m_totalGlyphsCachedSize (size_t) [READ] */
  totalGlyphsCachedSize = (_init_extra_loadFlag(this), _init_totalGlyphsCachedSize(this, 0));

  /** Carbon method ClearBuffer -> PyClearBuffer (MAP_METHOD). */
  ClearBuffer(...args) {
    throw new Error("Tr2FontManager.ClearBuffer is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ClearCachedGlyphs (MAP_METHOD_AND_WRAP). */
  ClearCachedGlyphs(...args) {
    throw new Error("Tr2FontManager.ClearCachedGlyphs is not implemented in CarbonEngineJS.");
  }

  /** Carbon method LookupGlyphIndex -> LookupFaceIDAndGlyphIndex (MAP_METHOD_AND_WRAP). */
  LookupGlyphIndex(...args) {
    throw new Error("Tr2FontManager.LookupGlyphIndex is not implemented in CarbonEngineJS.");
  }

  /** Carbon method LookupKerningXP -> PyLookupKerningXP (MAP_METHOD_AND_WRAP). */
  LookupKerningXP(...args) {
    throw new Error("Tr2FontManager.LookupKerningXP is not implemented in CarbonEngineJS.");
  }

  /** Carbon method LookupMetrics -> LookupMetricsFromScript (MAP_METHOD_AND_WRAP). */
  LookupMetrics(...args) {
    throw new Error("Tr2FontManager.LookupMetrics is not implemented in CarbonEngineJS.");
  }

  /** Carbon method LookupSBit (MAP_METHOD_AND_WRAP). */
  LookupSBit(...args) {
    throw new Error("Tr2FontManager.LookupSBit is not implemented in CarbonEngineJS.");
  }

  /** Carbon method TrimGlyphCache (MAP_METHOD_AND_WRAP). */
  TrimGlyphCache(...args) {
    throw new Error("Tr2FontManager.TrimGlyphCache is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2FontManager as Tr2FontManager };
//# sourceMappingURL=Tr2FontManager.js.map
