// Source: trinity/trinity/Controllers/Tr2TimelineController.h
// Source: trinity/trinity/Controllers/Tr2TimelineController.cpp:24-28
import { meta, blue } from "#schema";


/**
 * Native timeline structure with float32 start/end times and a uint32 track.
 * Adapted: registration names this JavaScript record for existing serialized
 * graphs; the native struct has no IRoot identity or Blue query table. Carbon
 * leaves each field unset and fills it when adding an action.
 * Native 64-bit size 12; offsets and storage types: trinity/trinity/
 * Controllers/Tr2TimelineController.h:17-22; Controllers/Tr2TimelineController.cpp:24-28.
 */
@meta.carbon("Tr2TimelineEntry")
@meta.struct.define({ size: 12 })
export class Tr2TimelineEntry
{
  /** Inclusive start of the action interval, in timeline seconds. Carbon leaves it unset. */
  @meta.struct.FLOAT32_1(0)
  startTime = 0;

  /** Exclusive end of the action interval, in timeline seconds. Carbon leaves it unset. */
  @meta.struct.FLOAT32_1(4)
  endTime = 0;

  /** Track identifier used to enable or disable this action. Carbon leaves it unset. */
  @meta.struct.UINT32_1(8)
  trackID = 0;
}
