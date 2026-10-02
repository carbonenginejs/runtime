// Source: trinity/trinity/RenderJob/TriStepFilterVisibilityResults.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { FilterType } from "../../generated/renderJob/enums.js";
import { blue, EnumRegistrationType } from "#blue";

/** A render step that filters one visibility-result set into another by event and object filter. */
@meta.define({ className: "TriStepFilterVisibilityResults", family: "renderJob" })
export class TriStepFilterVisibilityResults extends TriRenderStep
{

  /** m_eventFilter (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  eventFilter = 0xffffffff;

  /** m_filterType (FilterType - enum FilterType) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.TriStepFilterVisibilityResults.FilterType")
  filterType = 1;

  /** m_inputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2VisibilityResults")
  inputResults = null;

  /** m_objects (PIRootVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IRoot")
  objects = [];

  /** m_outputResults (Tr2VisibilityResultsPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2VisibilityResults")
  outputResults = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.implemented
  __init__(input = null, output = null, eventFilter = undefined, filter = undefined)
  {
    this.SetInputResults(input);
    this.SetOutputResults(output);
    if (eventFilter !== undefined) this.SetEventFilter(eventFilter);
    if (filter !== undefined) this.SetFilterType(filter);
  }

  /** Carbon SetEventFilter (cpp:98): the event-type bitfield Execute masks by. */
  @meta.blue.method
  @meta.implemented
  SetEventFilter(eventFilter)
  {
    this.eventFilter = Number(eventFilter) >>> 0;
  }

  /** Carbon SetFilterType (cpp:112): ONLY_ vs EXCLUDE_OBJECTS_IN_LIST. */
  @meta.blue.method
  @meta.implemented
  SetFilterType(filterType)
  {
    this.filterType = Number(filterType) | 0;
  }

  /** Carbon SetInputResults (h:49-52): the non-owning source result set. */
  @meta.blue.method
  @meta.implemented
  SetInputResults(results)
  {
    this.inputResults = results ?? null;
  }

  /** Carbon SetOutputResults (h:53-56): the non-owning destination set. */
  @meta.blue.method
  @meta.implemented
  SetOutputResults(results)
  {
    this.outputResults = results ?? null;
  }

  /**
   * Filters the input visibility results into the output set using the event and object masks.
   */
  @meta.blue.method
  @meta.adapted
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

// Registered as Carbon registers it (trinity/trinity/RenderJob/TriStepFilterVisibilityResults_Blue.cpp:51).
blue.enums.RegisterEnum("trinity.TriStepFilterVisibilityResults.FilterType", TriStepFilterVisibilityResults.FilterType, {
  source: "trinity/trinity/RenderJob/TriStepFilterVisibilityResults.h", family: "renderJob", line: 41,
  exposedName: "TRIVISIBILITY_FILTER_TYPE", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/RenderJob/TriStepFilterVisibilityResults_Blue.cpp:44",
  chooser: [
    { name: "TRIVISIBILITY_FILTER_ONLY_OBJECTS_IN_LIST", value: TriStepFilterVisibilityResults.FilterType.ONLY_OBJECTS_IN_LIST, description: "Only allow objects/lights in the objects list" },
    { name: "TRIVISIBILITY_FILTER_EXCLUDE_OBJECTS_IN_LIST", value: TriStepFilterVisibilityResults.FilterType.EXCLUDE_OBJECTS_IN_LIST, description: "Exclude objects/lights in the objects list" }
  ]
});
