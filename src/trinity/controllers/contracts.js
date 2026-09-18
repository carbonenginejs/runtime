// Source: blueexposure/include/IList.h
import { BLUELISTEVENT } from "#consts/blue";
// Source: trinity/trinity/Controllers/Tr2ControllerFloatVariable.h

// One vocabulary, owned by IListNotify in global/blue. These are the donor's
// own member names, re-exported flat for controller code - the compatibility
// alias the enum-placement rule allows.
export const BELIST_INSERTED = BLUELISTEVENT.BELIST_INSERTED;
export const BELIST_REMOVED = BLUELISTEVENT.BELIST_REMOVED;
export const BELIST_SWAPPED = BLUELISTEVENT.BELIST_SWAPPED;
export const BELIST_MOVED = BLUELISTEVENT.BELIST_MOVED;
export const BELIST_EVENTMASK = BLUELISTEVENT.BELIST_EVENTMASK;
export const BELIST_UNLOADSTART = BLUELISTEVENT.BELIST_UNLOADSTART;
export const BELIST_LOADFINISHED = BLUELISTEVENT.BELIST_LOADFINISHED;
export const BELIST_LOADING = BLUELISTEVENT.BELIST_LOADING;
export const BELIST_UNLOADING = BLUELISTEVENT.BELIST_UNLOADING;
export const TR2_DIRTY_ALL = (1n << 64n) - 1n;

/**
 * Gets the wall-clock time in seconds that controllers throttle against, from
 * performance.now when available and Date.now otherwise.
 */
export function GetControllerActualTimeSeconds()
{
  return GetClockSeconds();
}

/**
 * Gets the simulation frame time in seconds; the JS port has no separate sim
 * clock, so this currently returns the same clock as the actual time.
 */
export function GetControllerFrameTimeSeconds()
{
  return GetClockSeconds();
}

/**
 * Gets the controller time base in seconds, which Carbon defines as the frame
 * time.
 */
export function GetControllerTimeSeconds()
{
  return GetControllerFrameTimeSeconds();
}

function GetClockSeconds()
{
  if (typeof performance !== "undefined")
  {
    return performance.now() / 1000;
  }
  return Date.now() / 1000;
}

/**
 * Coerces a variable dirty mask to BigInt so the 64-bit mask arithmetic used by
 * state machines stays exact.
 */
export function ToDirtyMask(value)
{
  return typeof value === "bigint" ? value : BigInt(value);
}
