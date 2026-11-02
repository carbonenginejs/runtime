// Source: blue/include/IBlueResMan.h:20-35
//
// Optional callbacks a caller may pass to GetResource to learn which of the two
// things happened. Carbon's comment states the rule: "All callbacks are
// guaranteed to be made during the (blocking) call to GetResource on the main
// thread, so temporary lifetime objects that implement the callbacks are
// valid." BlueResMan makes them at Carbon's sites: OnResourceFromCache on a
// cache hit (BlueResMan.cpp:188-210), OnResourceCreated after the factory and
// before Initialize (:237-240 for dynamic:, :281-286 otherwise).
//
// Both have empty bodies in Carbon rather than being pure virtual, so an
// implementer overrides only the half it cares about, and neither is abstract:
// doing nothing IS the declared default.
import { CjsSchema } from "#schema";

/** `IBlueResManNotifications` - optional per-call notice of how GetResource answered. */
export class IBlueResManNotifications
{
  /**
   * `OnResourceCreated` - the resource was not cached and has just been made.
   *
   * Carbon is precise about when: the instance exists but has NOT yet been
   * Initialize()'d.
   *
   * @implemented
   * @param {BlueAsyncRes} _resource The new resource (Carbon's `void*`).
   * @returns {void}
   */
  OnResourceCreated(_resource) {}

  /**
   * `OnResourceFromCache` - the resource was already in the cache.
   *
   * @implemented
   * @param {BlueAsyncRes} _resource The cached resource (Carbon's `void*`).
   * @returns {void}
   */
  OnResourceFromCache(_resource) {}
}

CjsSchema.meta.carbon("IBlueResManNotifications")(IBlueResManNotifications);

// BOTH CALLBACKS ARE EMPTY IN THE DONOR, NOT PURE VIRTUAL:
//
//     virtual void OnResourceCreated( void* ) {}
//     virtual void OnResourceFromCache( void* ) {}
//                                      // IBlueResMan.h:28,31
//
// Carbon's protected non-virtual destructor (:33-34) only stops deletion
// through the interface; JavaScript has no destructor to port.
