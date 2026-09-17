// Source: blue/include/IBlueResMan.h:20-34
//
// Optional callbacks a caller may pass to GetResource to learn which of the two
// things happened. Carbon's comment is the contract: "All callbacks are
// guaranteed to be made during the (blocking) call to GetResource on the main
// thread, so temporary lifetime objects that implement the callbacks are
// valid."
//
// Both have empty bodies in Carbon rather than being pure virtual, so an
// implementer overrides only the half it cares about. That is why these carry
// no abstract marker: doing nothing IS the declared default, and a caller who
// supplied the object still gets the other callback.
import { CjsSchema } from "#schema";

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
