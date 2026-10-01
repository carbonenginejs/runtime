// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
// Source: trinity/trinity/Curves/TriCurveSet_Blue.cpp
import { meta, types } from "#schema";


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
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** First scaled-time sample in seconds. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  startTime = 0;

  /** Last scaled-time sample in seconds. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  endTime = 1;

  /** Whether playback wraps within the interval. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  looped = false;
}

// EXPOSURE_END: this plain IRoot record exposes only its concrete identity.
meta.carbon.interfaceTable({ interfaces: [Tr2CurveSetRange], chainTo: null })(Tr2CurveSetRange, { kind: "class" });
