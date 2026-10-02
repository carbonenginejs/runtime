// Source: trinity/trinity/Controllers/Tr2TimelineController.h
// Source: trinity/trinity/Controllers/Tr2TimelineController.cpp:24-28
import { meta } from "#schema";


/**
 * Native timeline structure with float32 start/end times and a uint32 track.
 * Adapted: registration names this JavaScript record for existing serialized
 * graphs; the native struct has no IRoot identity or Blue query table. Zero
 * defaults retain the existing JS construction behavior; Carbon fills each
 * field when adding an action.
 * Native 64-bit size 12; offsets and storage types: trinity/trinity/
 * Controllers/Tr2TimelineController.h:17-22; Controllers/Tr2TimelineController.cpp:24-28.
 */
@meta.define({
  className: "Tr2TimelineEntry",
  family: "controllers"
})
@meta.struct.define({ size: 12 })
export class Tr2TimelineEntry
{
  /** Inclusive start of the action interval, in timeline seconds. */
  @meta.struct.FLOAT32_1(0)
  startTime = 0;

  /** Exclusive end of the action interval, in timeline seconds. */
  @meta.struct.FLOAT32_1(4)
  endTime = 0;

  /** Track identifier used to enable or disable this action. */
  @meta.struct.UINT32_1(8)
  trackID = 0;
}
