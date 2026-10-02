// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
// Source: trinity/trinity/Curves/TriCurveSet_Blue.cpp
import { meta } from "#schema";


/**
 * Named sub-interval of a curve set's scaled timeline, giving a start and end
 * time and whether playback loops inside it.
 */
@meta.define({
  className: "Tr2CurveSetRange",
  family: "curves"
})
export class Tr2CurveSetRange
{
  /** Authored name used by TriCurveSet.PlayTimeRange. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** First scaled-time sample in seconds. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  startTime = 0;

  /** Last scaled-time sample in seconds. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  endTime = 1;

  /** Whether playback wraps within the interval. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  looped = false;
}

// EXPOSURE_END: this plain IRoot record exposes only its concrete identity.
meta.blue.interfaceTable({ interfaces: [Tr2CurveSetRange], chainTo: null })(Tr2CurveSetRange, { kind: "class" });
