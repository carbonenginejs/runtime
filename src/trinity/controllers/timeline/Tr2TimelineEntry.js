// Source: trinity/trinity/Controllers/Tr2TimelineController.h
// Source: trinity/trinity/Controllers/Tr2TimelineController.cpp:24-28
import { meta, types } from "#schema";


/**
 * Native timeline structure with float32 start/end times and a uint32 track.
 * Adapted: registration names this JavaScript record for existing serialized
 * graphs; the native struct has no IRoot identity or Blue query table. Zero
 * defaults retain the existing JS construction behavior; Carbon fills each
 * field when adding an action.
 */
@meta.define({
  className: "Tr2TimelineEntry",
  family: "controllers"
})
export class Tr2TimelineEntry
{
  /** Inclusive start of the action interval, in timeline seconds. */
  @types.float32
  startTime = 0;

  /** Exclusive end of the action interval, in timeline seconds. */
  @types.float32
  endTime = 0;

  /** Track identifier used to enable or disable this action. */
  @types.uint32
  trackID = 0;
}
