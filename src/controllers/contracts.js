// Source: E:\carbonengine\blueexposure\include\IList.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Tr2ControllerFloatVariable.h

export const BELIST_INSERTED = 0x08;
export const BELIST_REMOVED = 0x09;
export const BELIST_EVENTMASK = 0x0f;
export const BELIST_UNLOADSTART = 0x07;
export const BELIST_LOADFINISHED = 0x06;
export const BELIST_LOADING = 0x10;
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
