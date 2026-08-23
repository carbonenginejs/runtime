// Source: trinity/trinity/Controllers/Tr2TimelineController.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";


/** Defines one action's authored start/end interval and track identifier within a timeline controller. */
@type.define({
  className: "Tr2TimelineEntry",
  family: "controllers"
})
export class Tr2TimelineEntry extends CjsModel
{
  /** startTime (float) */
  @type.float32
  startTime = 0;

  /** endTime (float) */
  @type.float32
  endTime = 0;

  /** trackID (uint32_t) */
  @type.uint32
  trackID = 0;
}
