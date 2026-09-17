// Source: blue/include/IBlueResMan.h
//
// The resource manager as its CONSUMERS see it. Carbon publishes this
// interface and the extern `BeResMan` that points at one (`:135`); the
// implementation, `BlueResMan`, is never visible outside blue. Trinity takes
// this one header through `StdAfx.h:54` and calls it at 94 sites.
//
// That split is the point. `CjsResMan` has 68 public methods - configuration,
// queue driving, diagnostics and internals alongside the verbs a caller
// actually uses - and publishing all of it to everybody is why nothing can
// tell which methods are the interface. Eighteen are.
//
// The `W` variants collapse: they are Carbon's wide-character twins, and
// JavaScript strings carry no such distinction.
import { CjsSchema, compose, impl } from "#schema";

/** `BlueResManQueue` - the queues the manager runs work on. */
export const BlueResManQueue = Object.freeze({
  BRMQ_MAIN: 0,
  BRMQ_BACKGROUND: 1,
  BRMQ_COUNT: 2
});

/** `IBlueResMan` - the resource manager a consumer sees, per blue/include/IBlueResMan.h. */
export class IBlueResMan
{
  /** `GetResource` - the resource at this path, created or taken from the cache. */
  GetResource(_path, _options) {}

  /** `LoadObject` - an object built from a blue or red file, chosen by extension. */
  LoadObject(_path, _init) {}

  /** `SaveObject` - write an object to a blue or red file, chosen by extension. */
  SaveObject(_object, _path) {}

  /** `IsOnMainThread` - whether the caller shares the main-thread queue's thread. */
  IsOnMainThread() {}

  /** `AddToQueue` - queue a callback on one of the manager's queues. */
  AddToQueue(_queue, _callback, _context, _flags, _id) {}

  /** `CancelFromQueue` - cancel a previously queued callback. */
  CancelFromQueue(_queue, _id) {}

  /** `GetNextIdForQueue` - the id a queue would issue next, so a caller can tell whether anything was added. */
  GetNextIdForQueue(_queue) {}

  /** `PumpMainThreadQueue` - run one main-thread item; false when the queue was empty. */
  PumpMainThreadQueue() {}

  /** `PauseQueue` - stop a queue running work. */
  PauseQueue(_queue) {}

  /** `ResumeQueue` - let a paused queue run again. */
  ResumeQueue(_queue) {}

  /** `SetUrgentResourceLoads` - mark subsequent loads urgent. */
  SetUrgentResourceLoads(_urgent) {}

  /** `IsUrgentResourceLoads` - whether loads are currently marked urgent. */
  IsUrgentResourceLoads() {}

  /** `ReserveBackgroundLoadMemory` - claim background-load memory, blocking while over budget. */
  ReserveBackgroundLoadMemory(_size) {}

  /** `ReleaseBackgroundLoadMemory` - return claimed background-load memory. */
  ReleaseBackgroundLoadMemory(_size) {}

  /** `GetPendingLoads` - how many loads have not finished. */
  GetPendingLoads() {}

  /** `GetPendingPrepares` - how many prepares have not finished. */
  GetPendingPrepares() {}

  /** `RegisterResourceConstructor` - bind a `dynamic:/<name>` factory, as the gradient and colour textures do for themselves. */
  RegisterResourceConstructor(_name, _constructor) {}

  /** `UnregisterResourceConstructor` - remove a `dynamic:/<name>` factory. */
  UnregisterResourceConstructor(_name) {}

  static Queue = BlueResManQueue;
}

for (const method of [
  "GetResource", "LoadObject", "SaveObject", "IsOnMainThread", "AddToQueue", "CancelFromQueue",
  "GetNextIdForQueue", "PumpMainThreadQueue", "PauseQueue", "ResumeQueue", "SetUrgentResourceLoads",
  "IsUrgentResourceLoads", "ReserveBackgroundLoadMemory", "ReleaseBackgroundLoadMemory",
  "GetPendingLoads", "GetPendingPrepares", "RegisterResourceConstructor", "UnregisterResourceConstructor"
])
{
  CjsSchema.decorateMethod(IBlueResMan, method, compose.abstract, impl.abstract);
}

CjsSchema.define(IBlueResMan, { className: "IBlueResMan", carbon: "IBlueResMan", family: "blue", fields: {} });
