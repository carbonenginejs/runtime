import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_query, _init_extra_query, _init_timer, _init_extra_timer, _init_owner, _init_extra_owner, _init_message, _init_extra_message, _init_zones, _init_extra_zones, _init_stack, _init_extra_stack, _init_frameFence, _init_extra_frameFence, _init_pendingCapture, _init_extra_pendingCapture, _init_capturing, _init_extra_capturing;

/** Tr2GpuProfiler (trinityCore) - generated from schema shapeHash 4a61268c.... */
let _Tr2GpuProfiler;
class Tr2GpuProfiler extends CjsModel {
  static {
    ({
      e: [_init_query, _init_extra_query, _init_timer, _init_extra_timer, _init_owner, _init_extra_owner, _init_message, _init_extra_message, _init_zones, _init_extra_zones, _init_stack, _init_extra_stack, _init_frameFence, _init_extra_frameFence, _init_pendingCapture, _init_extra_pendingCapture, _init_capturing, _init_extra_capturing, _initProto],
      c: [_Tr2GpuProfiler, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GpuProfiler",
      family: "trinityCore"
    })], [[type.rawStruct("Tr2PipelineStatsQueryAL"), 0, "query"], [type.rawStruct("Tr2GpuTimerAL"), 0, "timer"], [type.objectRef("IRoot"), 0, "owner"], [[type, type.string], 16, "message"], [type.list("Zone"), 0, "zones"], [type.list("size_t"), 0, "stack"], [type.rawStruct("Tr2FenceAL"), 0, "frameFence"], [[type, type.boolean], 16, "pendingCapture"], [[type, type.boolean], 16, "capturing"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsReportReady"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ClearData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Capture"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetFrameReport"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_capturing(this);
  }
  /** query (Tr2PipelineStatsQueryAL) */
  query = (_initProto(this), _init_query(this, null));

  /** timer (Tr2GpuTimerAL) */
  timer = (_init_extra_query(this), _init_timer(this, null));

  /** owner (IRootPtr) */
  owner = (_init_extra_timer(this), _init_owner(this, null));

  /** message (std::string) */
  message = (_init_extra_owner(this), _init_message(this, ""));

  /** m_zones (std::vector<Zone>) */
  zones = (_init_extra_message(this), _init_zones(this, []));

  /** m_stack (std::vector<size_t>) */
  stack = (_init_extra_zones(this), _init_stack(this, []));

  /** m_frameFence (Tr2FenceAL) */
  frameFence = (_init_extra_stack(this), _init_frameFence(this, null));

  /** m_pendingCapture (bool) */
  pendingCapture = (_init_extra_frameFence(this), _init_pendingCapture(this, false));

  /** m_capturing (bool) */
  capturing = (_init_extra_pendingCapture(this), _init_capturing(this, false));

  /** Carbon method IsReportReady -> IsDataReady (MAP_METHOD_AND_WRAP). */
  IsReportReady(...args) {
    throw new Error("Tr2GpuProfiler.IsReportReady is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ClearData (MAP_METHOD_AND_WRAP). */
  ClearData(...args) {
    throw new Error("Tr2GpuProfiler.ClearData is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Capture (MAP_METHOD_AND_WRAP). */
  Capture(...args) {
    throw new Error("Tr2GpuProfiler.Capture is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetFrameReport (MAP_METHOD_AND_WRAP). */
  GetFrameReport(...args) {
    throw new Error("Tr2GpuProfiler.GetFrameReport is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2GpuProfiler as Tr2GpuProfiler };
//# sourceMappingURL=Tr2GpuProfiler.js.map
