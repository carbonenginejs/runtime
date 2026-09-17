// Source: blueexposure/include/IList.h
import { BlueListEvent } from "#consts/trinity";
// Source: trinity/trinity/Controllers/Tr2ControllerFloatVariable.h

// One vocabulary, defined in global/consts/trinity.js. These names are the
// donor's own spelling and stay as the import surface for controller code.
export const BELIST_INSERTED = BlueListEvent.INSERTED;
export const BELIST_REMOVED = BlueListEvent.REMOVED;
export const BELIST_SWAPPED = BlueListEvent.SWAPPED;
export const BELIST_MOVED = BlueListEvent.MOVED;
export const BELIST_EVENTMASK = BlueListEvent.EVENTMASK;
export const BELIST_UNLOADSTART = BlueListEvent.UNLOADSTART;
export const BELIST_LOADFINISHED = BlueListEvent.LOADFINISHED;
export const BELIST_LOADING = BlueListEvent.LOADING;
export const BELIST_UNLOADING = BlueListEvent.UNLOADING;
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
