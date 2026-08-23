import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from '../../renderJob/step/TriRenderStep.js';

let _initProto, _initClass, _init_view, _init_extra_view, _init_viewport, _init_extra_viewport, _init_projection, _init_extra_projection, _init_sharedMemoryHandle, _init_extra_sharedMemoryHandle, _init_needsHndl, _init_extra_needsHndl, _init_readingHndl, _init_extra_readingHndl, _init_writingHndl, _init_extra_writingHndl, _init_sharedMemory, _init_extra_sharedMemory, _init_id, _init_extra_id;

/** TriStepRemoteUpdate (renderJob) - generated from schema shapeHash 818ed4d3.... */
let _TriStepRemoteUpdate;
class TriStepRemoteUpdate extends _TriRenderStep {
  static {
    ({
      e: [_init_view, _init_extra_view, _init_viewport, _init_extra_viewport, _init_projection, _init_extra_projection, _init_sharedMemoryHandle, _init_extra_sharedMemoryHandle, _init_needsHndl, _init_extra_needsHndl, _init_readingHndl, _init_extra_readingHndl, _init_writingHndl, _init_extra_writingHndl, _init_sharedMemory, _init_extra_sharedMemory, _init_id, _init_extra_id, _initProto],
      c: [_TriStepRemoteUpdate, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRemoteUpdate",
      family: "renderJob"
    })], [[type.objectRef("TriView"), 0, "view"], [type.objectRef("TriViewport"), 0, "viewport"], [type.objectRef("TriProjection"), 0, "projection"], [type.rawStruct("HANDLE"), 0, "sharedMemoryHandle"], [type.rawStruct("HANDLE"), 0, "needsHndl"], [type.rawStruct("HANDLE"), 0, "readingHndl"], [type.rawStruct("HANDLE"), 0, "writingHndl"], [type.objectRef("char"), 0, "sharedMemory"], [[type, type.int32], 16, "id"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "__init__"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_id(this);
  }
  /** m_view (TriViewPtr) */
  view = (_initProto(this), _init_view(this, null));

  /** m_viewport (TriViewportPtr) */
  viewport = (_init_extra_view(this), _init_viewport(this, null));

  /** m_projection (TriProjectionPtr) */
  projection = (_init_extra_viewport(this), _init_projection(this, null));

  /** m_sharedMemoryHandle (HANDLE) */
  sharedMemoryHandle = (_init_extra_projection(this), _init_sharedMemoryHandle(this, null));

  /** m_needsHndl (HANDLE) */
  needsHndl = (_init_extra_sharedMemoryHandle(this), _init_needsHndl(this, null));

  /** m_readingHndl (HANDLE) */
  readingHndl = (_init_extra_needsHndl(this), _init_readingHndl(this, null));

  /** m_writingHndl (HANDLE) */
  writingHndl = (_init_extra_readingHndl(this), _init_writingHndl(this, null));

  /** m_sharedMemory (const char*) */
  sharedMemory = (_init_extra_writingHndl(this), _init_sharedMemory(this, null));

  /** m_id (int) */
  id = (_init_extra_sharedMemory(this), _init_id(this, -1));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(...args) {
    throw new Error("TriStepRemoteUpdate.__init__ is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _TriStepRemoteUpdate as TriStepRemoteUpdate };
//# sourceMappingURL=TriStepRemoteUpdate.js.map
