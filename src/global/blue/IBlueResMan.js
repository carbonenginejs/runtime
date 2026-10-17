// Source: blue/include/IBlueResMan.h
//
// The resource manager as its CONSUMERS see it. Carbon publishes this
// interface and the extern `BeResMan` that points at one (`:135`); the
// implementation, `BlueResMan`, is never visible outside blue. Trinity takes
// this one header through `StdAfx.h:54` and calls it at 94 sites.
//
// That split is the point. `CjsBlueResMan` has 68 public methods - configuration,
// queue driving, diagnostics and internals alongside the verbs a caller
// actually uses - and publishing all of it to everybody is why nothing can
// tell which methods are the interface. Twenty-one are.
//
// The narrow and wide forms (`GetResource` / `GetResourceW`, `SaveObject` /
// `SaveObjectW`, and `LoadObject`'s `const char*` / `const wchar_t*`
// overloads) are identical in JavaScript, whose strings carry no encoding;
// every one exists, and one forwards to the other.
import { CjsSchema, blue } from "#schema";

/** `BlueResManQueue` - the queues the manager runs work on. */
export const BlueResManQueue = Object.freeze({
  BRMQ_MAIN: 0,
  BRMQ_BACKGROUND: 1,
  BRMQ_COUNT: 2
});

/** `IBlueResMan` - the resource manager a consumer sees, per blue/include/IBlueResMan.h. */
export class IBlueResMan
{
  /**
   * `GetResource( const std::string& path, const std::string& ex, const Be::IID& iid,
   * void** resource, IBlueResManNotifications* notifications = nullptr )` - the
   * resource at this path, created or taken from the cache. Carbon writes the
   * resource to its `resource` output parameter and returns whether it did;
   * the output parameter is the return value here.
   *
   * Adapted: a resource-options object carries the extension (`ext`) and the
   * requested kind (`requirement`, standing for the IID) with the browser's
   * own request settings.
   *
   * @param {string} _path Resource path.
   * @param {object} [_options] Resource options.
   * @returns {*} The resource.
   */
  GetResource(_path, _options) {}

  /**
   * `GetResourceW` - `GetResource` for a wide-character path; identical in
   * JavaScript.
   *
   * @param {string} _path Resource path.
   * @param {object} [_options] Resource options, as `GetResource`.
   * @returns {*} The resource.
   */
  GetResourceW(_path, _options) {}

  /**
   * `LoadObject( const char* name, Be::LOADOBJECT_INIT_FLAG init = Be::LDOBJ_INITIALIZE )`
   * - an object built from a blue or red file, chosen by extension.
   *
   * @param {string} _path Object file path.
   * @param {*} [_init] Load options.
   * @returns {*} The object.
   */
  LoadObject(_path, _init) {}

  /**
   * `LoadObject( const wchar_t* name, Be::LOADOBJECT_INIT_FLAG init = Be::LDOBJ_INITIALIZE )`
   * - `LoadObject` for a wide-character path; identical in JavaScript.
   *
   * @param {string} _path Object file path.
   * @param {*} [_init] Load options, as `LoadObject`.
   * @returns {*} The object.
   */
  LoadObject__WChars(_path, _init) {}

  /**
   * `SaveObject( IRoot* obj, const char* name )` - write an object to a blue or
   * red file, chosen by extension.
   *
   * @param {object} _object The object.
   * @param {string} _path File path.
   * @returns {boolean} Whether it was written.
   */
  SaveObject(_object, _path) {}

  /**
   * `SaveObjectW( IRoot* obj, const wchar_t* name )` - `SaveObject` for a
   * wide-character path; identical in JavaScript.
   *
   * @param {object} _object The object.
   * @param {string} _path File path.
   * @returns {boolean} Whether it was written.
   */
  SaveObjectW(_object, _path) {}

  /** `IsOnMainThread` - whether the caller shares the main-thread queue's thread. */
  IsOnMainThread() {}

  /**
   * `AddToQueue` - queue a callback on one of the manager's queues. Carbon
   * writes the request id to its `id` output parameter; the output parameter
   * is the return value here.
   *
   * @param {*} _queue The queue.
   * @param {Function} _callback The callback.
   * @param {*} _context The callback's context.
   * @param {number} _flags `IBlueCallbackMan` flags.
   * @returns {number} The request id.
   */
  AddToQueue(_queue, _callback, _context, _flags) {}

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
  "GetResource", "GetResourceW", "LoadObject", "LoadObject__WChars", "SaveObject", "SaveObjectW",
  "IsOnMainThread", "AddToQueue", "CancelFromQueue",
  "GetNextIdForQueue", "PumpMainThreadQueue", "PauseQueue", "ResumeQueue", "SetUrgentResourceLoads",
  "IsUrgentResourceLoads", "ReserveBackgroundLoadMemory", "ReleaseBackgroundLoadMemory",
  "GetPendingLoads", "GetPendingPrepares", "RegisterResourceConstructor", "UnregisterResourceConstructor"
])
{
  CjsSchema.decorateMethod(IBlueResMan, method, blue.abstract);
}

CjsSchema.blue.define(IBlueResMan, { className: "IBlueResMan", fields: {} });
