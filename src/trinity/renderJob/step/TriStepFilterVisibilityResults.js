import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepFilterVisibilityResults.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { FilterType } from "../../generated/renderJob/enums.js";
import { blue } from "#blue";
import "../../core/context/Tr2VisibilityResults/Tr2VisibilityEvent.js";

/** A render step that filters one visibility-result set into another by event and object filter. */
@be.define("TriStepFilterVisibilityResults")

@be.exposureChainTo(TriRenderStep)
export class TriStepFilterVisibilityResults extends TriRenderStep
{

  /**
   * m_eventFilter (uint32_t) [READWRITE, PERSIST]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/RenderJob/TriStepFilterVisibilityResults_Blue.cpp:62); chooser TriVisibilityEventTypeChooser (trinity/trinity/RenderJob/TriStepFilterVisibilityResults_Blue.cpp:7).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST, "trinity.TRIVISIBILITY_EVENT_TYPE")
  @type.uint32
  eventFilter = 0xffffffff;

  /**
   * m_filterType (FilterType - enum FilterType) [READWRITE, PERSIST, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/RenderJob/TriStepFilterVisibilityResults_Blue.cpp:69); chooser TriVisibilityResultsFilterTypeChooser (trinity/trinity/RenderJob/TriStepFilterVisibilityResults_Blue.cpp:44).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.TriStepFilterVisibilityResults.FilterType")
  @type.int32
  @type.enum("trinity.TriStepFilterVisibilityResults.FilterType")
  filterType = 1;

  /** m_inputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("Tr2VisibilityResults")
  inputResults = null;

  /** m_objects (PIRootVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IRoot")
  objects = [];

  /** m_outputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("Tr2VisibilityResults")
  outputResults = null;

  /**
   * Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   *
   * @implemented
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.implemented
  __init__(input = null, output = null, eventFilter = undefined, filter = undefined)
  {
    this.SetInputResults(input);
    this.SetOutputResults(output);
    if (eventFilter !== undefined) this.SetEventFilter(eventFilter);
    if (filter !== undefined) this.SetFilterType(filter);
  }

  /**
   * Carbon SetEventFilter (cpp:98): the event-type bitfield Execute masks by.
   *
   * @implemented
   */

  @meta.implemented
  SetEventFilter(eventFilter)
  {
    this.eventFilter = Number(eventFilter) >>> 0;
  }

  /**
   * Carbon SetFilterType (cpp:112): ONLY_ vs EXCLUDE_OBJECTS_IN_LIST.
   *
   * @implemented
   */

  @meta.implemented
  SetFilterType(filterType)
  {
    this.filterType = Number(filterType) | 0;
  }

  /**
   * Carbon SetInputResults (h:49-52): the non-owning source result set.
   *
   * @implemented
   */

  @meta.implemented
  SetInputResults(results)
  {
    this.inputResults = results ?? null;
  }

  /**
   * Carbon SetOutputResults (h:53-56): the non-owning destination set.
   *
   * @implemented
   */

  @meta.implemented
  SetOutputResults(results)
  {
    this.outputResults = results ?? null;
  }

  /**
   * Filters the input visibility results into the output set using the event and object masks.
   *
   * @adapted
   */

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
