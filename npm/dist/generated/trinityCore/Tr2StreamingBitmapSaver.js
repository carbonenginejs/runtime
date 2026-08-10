import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { PixelFormat } from '@carbonenginejs/runtime-utils/render-context';

let _initProto, _initClass, _init_currentOffset, _init_extra_currentOffset, _init_height, _init_extra_height, _init_format, _init_extra_format, _init_width, _init_extra_width;

/** Tr2StreamingBitmapSaver (trinityCore) - generated from schema shapeHash 95ea7d15.... */
let _Tr2StreamingBitmapSa;
new class extends _identity {
  static [class Tr2StreamingBitmapSaver extends CjsModel {
    static {
      ({
        e: [_init_currentOffset, _init_extra_currentOffset, _init_height, _init_extra_height, _init_format, _init_extra_format, _init_width, _init_extra_width, _initProto],
        c: [_Tr2StreamingBitmapSa, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2StreamingBitmapSaver",
        family: "trinityCore"
      })], [[[io, io.read, type, type.uint32], 16, "currentOffset"], [[io, io.read, type, type.uint32], 16, "height"], [[io, io.read, type, type.int32, void 0, type.enum("PixelFormat")], 16, "format"], [[io, io.read, type, type.uint32], 16, "width"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CopyFromRenderTargetRegion"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "EndSaving"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "FlushBatch"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "StartBatch"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_width(this);
    }
    /** m_currentOffset (uint32_t) [READ] */
    currentOffset = (_initProto(this), _init_currentOffset(this, 0));

    /** m_height (uint32_t) [READ] */
    height = (_init_extra_currentOffset(this), _init_height(this, 0));

    /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READ] */
    format = (_init_extra_height(this), _init_format(this, 0));

    /** m_width (uint32_t) [READ] */
    width = (_init_extra_format(this), _init_width(this, 0));

    /** Carbon method CopyFromRenderTargetRegion (MAP_METHOD_AND_WRAP). */
    CopyFromRenderTargetRegion(...args) {
      throw new Error("Tr2StreamingBitmapSaver.CopyFromRenderTargetRegion is not implemented in CarbonEngineJS.");
    }

    /** Carbon method EndSaving (MAP_METHOD_AND_WRAP). */
    EndSaving(...args) {
      throw new Error("Tr2StreamingBitmapSaver.EndSaving is not implemented in CarbonEngineJS.");
    }

    /** Carbon method FlushBatch (MAP_METHOD_AND_WRAP). */
    FlushBatch(...args) {
      throw new Error("Tr2StreamingBitmapSaver.FlushBatch is not implemented in CarbonEngineJS.");
    }

    /** Carbon method StartBatch (MAP_METHOD_AND_WRAP). */
    StartBatch(...args) {
      throw new Error("Tr2StreamingBitmapSaver.StartBatch is not implemented in CarbonEngineJS.");
    }
  }];
  PixelFormat = PixelFormat;
  constructor() {
    super(_Tr2StreamingBitmapSa), _initClass();
  }
}();

export { _Tr2StreamingBitmapSa as Tr2StreamingBitmapSaver };
//# sourceMappingURL=Tr2StreamingBitmapSaver.js.map
