import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_eventFilter, _init_extra_eventFilter, _init_filterType, _init_extra_filterType, _init_inputResults, _init_extra_inputResults, _init_objects, _init_extra_objects, _init_outputResults, _init_extra_outputResults;

/** A render step that filters one visibility-result set into another by event and object filter. */
let _TriStepFilterVisibil;
new class extends _identity {
  static [class TriStepFilterVisibilityResults extends _TriRenderStep {
    static {
      ({
        e: [_init_eventFilter, _init_extra_eventFilter, _init_filterType, _init_extra_filterType, _init_inputResults, _init_extra_inputResults, _init_objects, _init_extra_objects, _init_outputResults, _init_extra_outputResults, _initProto],
        c: [_TriStepFilterVisibil, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriStepFilterVisibilityResults",
        family: "renderJob"
      })], [[[io, io.persist, type, type.uint32], 16, "eventFilter"], [[io, io.persist, type, type.int32, void 0, schema.enum("FilterType")], 16, "filterType"], [[io, io.persist, void 0, type.model("Tr2VisibilityResults")], 16, "inputResults"], [[io, io.persist, void 0, type.list("IRoot")], 16, "objects"], [[io, io.persist, void 0, type.model("Tr2VisibilityResults")], 16, "outputResults"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
    }
    constructor(...args) {
      super(...args);
      _init_extra_outputResults(this);
    }
    /** m_eventFilter (uint32_t) [READWRITE, PERSIST] */
    eventFilter = (_initProto(this), _init_eventFilter(this, 0xffffffff));

    /** m_filterType (FilterType - enum FilterType) [READWRITE, PERSIST, ENUM] */
    filterType = (_init_extra_eventFilter(this), _init_filterType(this, 1));

    /** m_inputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
    inputResults = (_init_extra_filterType(this), _init_inputResults(this, null));

    /** m_objects (PIRootVector) [READ, PERSIST] */
    objects = (_init_extra_inputResults(this), _init_objects(this, []));

    /** m_outputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
    outputResults = (_init_extra_objects(this), _init_outputResults(this, null));

    /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    __init__(input = null, output = null, eventFilter = undefined, filter = undefined) {
      this.inputResults = input;
      this.outputResults = output;
      if (eventFilter !== undefined) this.eventFilter = Number(eventFilter) >>> 0;
      if (filter !== undefined) this.filterType = Number(filter) | 0;
    }

    /**
     * Filters the input visibility results into the output set using the event and object masks.
     */
    Execute() {
      if (this.inputResults && this.outputResults) {
        this.outputResults.Clear?.();
        for (const event of this.inputResults.GetEvents?.() ?? []) {
          const eventType = Number(event?.eventType ?? event?.m_eventType ?? 0) >>> 0;
          if (!(eventType & this.eventFilter)) continue;
          const userData = event?.userData ?? event?.m_userData ?? null;
          if (userData) {
            const listed = this.objects.includes(userData);
            if (this.filterType === _TriStepFilterVisibil.FilterType.EXCLUDE_OBJECTS_IN_LIST ? listed : !listed) continue;
          }
          this.outputResults.AddVisibilityEvent?.(event);
        }
      }
      return _TriRenderStep.Result.RS_OK;
    }
  }];
  FilterType = Object.freeze({
    ONLY_OBJECTS_IN_LIST: 0,
    EXCLUDE_OBJECTS_IN_LIST: 1
  });
  constructor() {
    super(_TriStepFilterVisibil), _initClass();
  }
}();

export { _TriStepFilterVisibil as TriStepFilterVisibilityResults };
//# sourceMappingURL=TriStepFilterVisibilityResults.js.map
