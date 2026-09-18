// Source: blue/include/IBlueResMan.h:20-34
//
// Optional callbacks a caller may pass to GetResource to learn which of the two
// things happened. Carbon's comment states the rule: "All callbacks are
// guaranteed to be made during the (blocking) call to GetResource on the main
// thread, so temporary lifetime objects that implement the callbacks are
// valid."
//
// Both have empty bodies in Carbon rather than being pure virtual, so an
// implementer overrides only the half it cares about. So they are marked
// `impl.noop` at the foot of this file and never `impl.abstract`: doing
// nothing IS the declared default, and a caller who supplied the object still
// gets the other callback.
import { CjsSchema, impl } from "#schema";

/** `IBlueResManNotifications` - optional per-call notice of how GetResource answered. */
export class IBlueResManNotifications
{
  /**
   * `OnResourceCreated` - the resource was not cached and has just been made.
   *
   * Carbon is precise about when: the instance exists but has NOT yet been
   * Initialize()'d.
   */
  OnResourceCreated(_resource) {}

  /** `OnResourceFromCache` - the resource was already in the cache. */
  OnResourceFromCache(_resource) {}
}

CjsSchema.define(IBlueResManNotifications, {
  className: "IBlueResManNotifications", carbon: "IBlueResManNotifications", family: "blue", fields: {}
});

// BOTH CALLBACKS ARE EMPTY IN THE DONOR, NOT PURE VIRTUAL:
//
//     virtual void OnResourceCreated( void* ) {}
//     virtual void OnResourceFromCache( void* ) {}
//                                      // IBlueResMan.h:28,31
//
// So an implementer overrides only the half it cares about, and neither is a
// divergence when left alone. That is `impl.noop`, not `impl.abstract`, and
// declaring it is what stops `@carbon.inherit` falling back to abstract and
// writing "Carbon leaves this unimplemented" onto every consumer.
CjsSchema.decorateMethod(IBlueResManNotifications, "OnResourceCreated", impl.noop);
CjsSchema.decorateMethod(IBlueResManNotifications, "OnResourceFromCache", impl.noop);
