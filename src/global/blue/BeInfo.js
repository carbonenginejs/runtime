// Source: blue/include/IBlueOS.h:55-90
//
// The record `BeOS->GetInfo()` returns: Blue's clocks, its framerate state and
// its pump counters in one place. Nineteen Carbon call sites read it.
//
// THE FIELDS DROP CARBON'S MEMBER PREFIXES, as every ported struct here does -
// `mRealTime` is `realTime`, `m_pumpTicksTotal` is `pumpTicksTotal`. The `m`
// and `m_` are C++ member markers, not part of the name.
//
// WHAT IS ACTUALLY FILLED IN, and it is worth being blunt: the clocks and the
// pump count. The framerate fields, the sleep and foreground overrides, the
// fake-time and time-adjustment fields and the build number are Blue's own
// bookkeeping for a pump this runtime does not have - they keep their Carbon
// defaults and nothing writes them. They are declared rather than omitted
// because a caller reading this record should see the same shape Carbon hands
// it, and because the alternative is discovering the omission by getting
// `undefined`.
import { CjsSchema } from "#schema";

/** `BeInfo` - Blue's clocks, framerate state and pump counters, per blue/include/IBlueOS.h:55. */
export class BeInfo
{
  /** `mStructSize` - size of the record; meaningless without C++ layout, kept for shape. */
  structSize = 0;

  // ----- Time management -----

  /** `mRealTime` - Blue UTC time, in 100ns ticks. */
  realTime = 0;

  /** `mSimTime` - like realTime, but sometimes slowed down to manage load. */
  simTime = 0;

  /** `mSimDilation` - the current factor between real and simulation advancement. */
  simDilation = 1;

  /** `mDilationSyncFactor` - the dilation synchronization is currently based on; may differ from simDilation. */
  dilationSyncFactor = 1;

  // ----- Framerate -----

  /** `mFps` - frames per second. */
  fps = 0;

  /** `mFpsRefreshRate` - time between recalculations of fps, in 100ns ticks. */
  fpsRefreshRate = 0;

  /** `mLockFramerate` - framerate locking; 0 for none. */
  lockFramerate = 0;

  /** `m_pumpTicksTotal` - pump calls since creation. */
  pumpTicksTotal = 0;

  /** `m_ioRunsTotal` - special IO scheduling runs. */
  ioRunsTotal = 0;

  // ----- Pumping -----

  /** `mSleepTime` - how long the pump sleeps. */
  sleepTime = 0;

  /** `mOverrideFG` - -1 always background, 1 always foreground, 0 neither. */
  overrideFG = 0;

  // ----- Carbon's own comment here is "ugh!" -----

  /** `mStartTime` - when the client started, in Blue UTC ticks. */
  startTime = 0;

  /** `mExtraFakeTime` - time added on purpose, for testing. */
  extraFakeTime = 0;

  /** `mTimeWarp` - the speed of time; 1.0 is one to one. */
  timeWarp = 1;

  /** `mTurnOffSetError` - quiet SetError for one report; Carbon resets it each time. */
  turnOffSetError = false;

  /** `mTimeAdjusted` - the difference SetTime was called with, or 0. */
  timeAdjusted = 0;

  /** `mMiniDump` - whether the executable handles its own minidumps. */
  miniDump = false;

  /** `mBuildno` - the build number. */
  buildno = 0;
}

CjsSchema.define(BeInfo, { className: "BeInfo", family: "blue", carbon: "BeInfo" });
