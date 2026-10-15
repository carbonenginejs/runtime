// Source: trinity/trinity/RenderJob/TriStepFilterVisibilityResults.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { FilterType } from "../../generated/renderJob/enums.js";
import { be } from "#blue";

/** A render step that filters one visibility-result set into another by event and object filter. */
@blue.define("TriStepFilterVisibilityResults")
export class TriStepFilterVisibilityResults extends TriRenderStep
{

  /** m_eventFilter (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  eventFilter = 0xffffffff;

  /** m_filterType (FilterType - enum FilterType) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.TriStepFilterVisibilityResults.FilterType")
  filterType = 1;

  /** m_inputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2VisibilityResults")
  inputResults = null;

  /** m_objects (PIRootVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IRoot")
  objects = [];

  /** m_outputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2VisibilityResults")
  outputResults = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @blue.method
  @meta.implemented
  __init__(input = null, output = null, eventFilter = undefined, filter = undefined)
  {
    this.SetInputResults(input);
    this.SetOutputResults(output);
    if (eventFilter !== undefined) this.SetEventFilter(eventFilter);
    if (filter !== undefined) this.SetFilterType(filter);
  }

  /** Carbon SetEventFilter (cpp:98): the event-type bitfield Execute masks by. */
  @blue.method
  @meta.implemented
  SetEventFilter(eventFilter)
  {
    this.eventFilter = Number(eventFilter) >>> 0;
  }

  /** Carbon SetFilterType (cpp:112): ONLY_ vs EXCLUDE_OBJECTS_IN_LIST. */
  @blue.method
  @meta.implemented
  SetFilterType(filterType)
  {
    this.filterType = Number(filterType) | 0;
  }

  /** Carbon SetInputResults (h:49-52): the non-owning source result set. */
  @blue.method
  @meta.implemented
  SetInputResults(results)
  {
    this.inputResults = results ?? null;
  }

  /** Carbon SetOutputResults (h:53-56): the non-owning destination set. */
  @blue.method
  @meta.implemented
  SetOutputResults(results)
  {
    this.outputResults = results ?? null;
  }

  /**
   * Filters the input visibility results into the output set using the event and object masks.
   */
  @blue.method
  @meta.adapted
  Execute()
  {
    if (this.inputResults && this.outputResults)
    {
      this.outputResults.Clear();
      for (const event of this.inputResults.GetEvents())
      {
        const eventType = Number(event?.eventType ?? event?.m_eventType ?? 0) >>> 0;
        if (!(eventType & this.eventFilter)) continue;
        const userData = event?.userData ?? event?.m_userData ?? null;
        if (userData)
        {
          const listed = this.objects.includes(userData);
          if (this.filterType === TriStepFilterVisibilityResults.FilterType.EXCLUDE_OBJECTS_IN_LIST ? listed : !listed) continue;
        }
        this.outputResults.AddVisibilityEvent(event);
      }
    }
    return TriRenderStep.Result.RS_OK;
  }

  static FilterType = FilterType;

}
