// Source: blue/include/IBlueOS.h
//
// The OS as its consumers see it, reached through its own extern beside
// `BeResMan` and `BePaths`:
//
//     extern BLUEIMPORT IBlueOS* BeOS;      // :226
//
// IT IS THE ROOT CLOCK, and that is what this port is for. Of roughly 180
// `BeOS->` calls in Carbon, 71 are the two time getters and 33 are tick and
// sim-rebase registration - so more than half of this service is the clock and
// the pump that drives it. Everything downstream hangs off it:
//
//   BeOS pumps -> IBlueEvents::OnTick( realTime, simTime )
//              -> TriDevice::OnTick advances m_animationTime (TriDevice.cpp:805-823)
//              -> Tr2Renderer::GetAnimationTime reads it back through gTriDev
//
// `TriDevice` registers itself with the cookie "Trinity"
// (`TriDevice.cpp:148,310,678`), which is why the device tick had no caller
// here until this existed.
//
// TIME IS `Be::Time`: a signed 64-bit count of 100-nanosecond ticks, "Same as
// Win32 FILETIME" (`blueexposure/include/BlueTypes.h:29`), so the epoch is
// 1601. TWO BASES, and confusing them is a four-century error:
//
// - `OnTick`'s `realTime` and `simTime` are SINCE THE CLIENT STARTED, per the
//   header's comments on those parameters;
// - `GetActualTime` and `GetCurrentFrameTime` are absolute Blue UTC.
//
// A JavaScript number holds a since-startup tick count exactly for about nine
// years. It CANNOT hold absolute Blue UTC exactly: 2026 is around 1.33e17
// ticks against a safe integer limit of 9.01e15, so absolute readings carry
// roughly 1.6-microsecond granularity rather than 100 nanoseconds. That is a
// platform fact, it is stated rather than worked around, and it matters to
// nothing that currently reads these - but it would matter to a caller
// differencing two absolute readings taken microseconds apart.
//
// The error, startup-argument and process-control half of this interface is
// declared and refused. It is a genuine operating-system service, it has no
// consumer in this runtime, and guessing at it would be inventing.
import { CjsSchema, compose, impl } from "#schema";

/** `IBlueOS` - the clock, the pump, error reporting and process control, per blue/include/IBlueOS.h. */
export class IBlueOS
{
  // ----- Startup and shutdown -----

  /** `Startup` - bring Blue up. */
  Startup(_pyOptimizeFlag) {}

  /** `Terminate` - end the process; Blue always shuts down by terminating. */
  Terminate(_retCode) {}

  /** `RegisterIndispensableTerminationStep` - work a DLL must do before a termination signal. */
  RegisterIndispensableTerminationStep(_callback) {}

  // ----- Scheduling -----

  /** `RegisterForTicks` - drive an IBlueEvents from the pump, with a cookie of the caller's choosing. */
  RegisterForTicks(_cb, _cookie) {}

  /** `UnregisterForTicks` - stop driving one. */
  UnregisterForTicks(_cb, _cookie) {}

  /** `RegisterForSimTimeRebase` - be told when the simulation clock is moved. */
  RegisterForSimTimeRebase(_cb) {}

  /** `UnregisterForSimTimeRebase` - stop being told. */
  UnregisterForSimTimeRebase(_cb) {}

  // ----- Error reporting -----

  /** `SetError` - report a BLUEERROR or HRESULT, optionally naming the reporter. */
  SetError(_error, _reporter, _format, ..._args) {}

  /** `GetError` - the error log by index, null once there are no more. */
  GetError(_index) {}

  /** `FormatError` - the error log formatted as a report. */
  FormatError() {}

  /** `GetLanguageId` - the language the client is running in. */
  GetLanguageId() {}

  // ----- Management -----

  /** `PumpOS` - one pump cycle: advance the clocks and tick every registrant. */
  PumpOS() {}

  // ----- Information -----

  /** `GetInfo` - the BeInfo record: real and simulation time, dilation, fps, pump counters. */
  GetInfo() {}

  /** `GetActualTime` - the wallclock, adjusted for server sync, in Blue UTC ticks. */
  GetActualTime() {}

  /** `IsPackaged` - whether the client is running from a package. */
  IsPackaged() {}

  /** `GetCurrentFrameTime` - the cached smoothed time for this frame, in Blue UTC ticks. */
  GetCurrentFrameTime() {}

  /** `RunStackless` - whether the stackless scheduler is in use. */
  RunStackless() {}

  /** `SetStartupArgs` - the command line, after any expansion from an @ file. */
  SetStartupArgs(_args) {}

  /** `GetStartupArgs` - that expanded command line. */
  GetStartupArgs() {}

  /** `HasStartupArg` - whether an argument was passed. */
  HasStartupArg(_arg) {}

  /** `GetInitTab` - the Python init table. */
  GetInitTab(_tabs) {}

  /** `GetStartupArgValue` - the value of a /arg=value argument. */
  GetStartupArgValue(_arg) {}

  /** `SetMarkupZonesInPython` - whether profiling zones are marked up in Python. */
  SetMarkupZonesInPython(_markupZonesInPython) {}

  /** `ConstructPathListFromManifest` - the path list a manifest describes. */
  ConstructPathListFromManifest(_pathlist, _verifyManifest) {}
}

for (const method of [
  "Startup", "Terminate", "RegisterIndispensableTerminationStep",
  "RegisterForTicks", "UnregisterForTicks", "RegisterForSimTimeRebase", "UnregisterForSimTimeRebase",
  "SetError", "GetError", "FormatError", "GetLanguageId",
  "PumpOS",
  "GetInfo", "GetActualTime", "IsPackaged", "GetCurrentFrameTime", "RunStackless",
  "SetStartupArgs", "GetStartupArgs", "HasStartupArg", "GetInitTab", "GetStartupArgValue",
  "SetMarkupZonesInPython", "ConstructPathListFromManifest"
])
{
  CjsSchema.decorateMethod(IBlueOS, method, compose.abstract, impl.abstract);
}
