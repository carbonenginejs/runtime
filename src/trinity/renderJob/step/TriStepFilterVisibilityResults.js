// Source: trinity/trinity/RenderJob/TriStepFilterVisibilityResults.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { FilterType } from "../../generated/renderJob/enums.js";

/** A render step that filters one visibility-result set into another by event and object filter. */
@type.define({ className: "TriStepFilterVisibilityResults", family: "renderJob" })
export class TriStepFilterVisibilityResults extends TriRenderStep
{

  /** m_eventFilter (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  eventFilter = 0xffffffff;

  /** m_filterType (FilterType - enum FilterType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("FilterType")
  filterType = 1;

  /** m_inputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2VisibilityResults")
  inputResults = null;

  /** m_objects (PIRootVector) [READ, PERSIST] */
  @io.persist
  @type.list("IRoot")
  objects = [];

  /** m_outputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2VisibilityResults")
  outputResults = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(input = null, output = null, eventFilter = undefined, filter = undefined)
  {
    this.SetInputResults(input);
    this.SetOutputResults(output);
    if (eventFilter !== undefined) this.SetEventFilter(eventFilter);
    if (filter !== undefined) this.SetFilterType(filter);
  }

  /** Carbon SetEventFilter (cpp:98): the event-type bitfield Execute masks by. */
  @carbon.method
  @impl.implemented
  SetEventFilter(eventFilter)
  {
    this.eventFilter = Number(eventFilter) >>> 0;
  }

  /** Carbon SetFilterType (cpp:112): ONLY_ vs EXCLUDE_OBJECTS_IN_LIST. */
  @carbon.method
  @impl.implemented
  SetFilterType(filterType)
  {
    this.filterType = Number(filterType) | 0;
  }

  /** Carbon SetInputResults (h:49-52): the non-owning source result set. */
  @carbon.method
  @impl.implemented
  SetInputResults(results)
  {
    this.inputResults = results ?? null;
  }

  /** Carbon SetOutputResults (h:53-56): the non-owning destination set. */
  @carbon.method
  @impl.implemented
  SetOutputResults(results)
  {
    this.outputResults = results ?? null;
  }

  /**
   * Filters the input visibility results into the output set using the event and object masks.
   */
  @carbon.method
  @impl.adapted
  Execute()
  {
    if (this.inputResults && this.outputResults)
    {
      this.outputResults.Clear();
      for (const event of this.inputResults.GetEvents?.() ?? [])
      {
        const eventType = Number(event?.eventType ?? event?.m_eventType ?? 0) >>> 0;
        if (!(eventType & this.eventFilter)) continue;
        const userData = event?.userData ?? event?.m_userData ?? null;
        if (userData)
        {
          const listed = this.objects.includes(userData);
          if (this.filterType === TriStepFilterVisibilityResults.FilterType.EXCLUDE_OBJECTS_IN_LIST ? listed : !listed) continue;
        }
        this.outputResults.AddVisibilityEvent?.(event);
      }
    }
    return TriRenderStep.Result.RS_OK;
  }

  static FilterType = FilterType;

}
