// Source: trinity/trinity/Tr2Event.h
import { meta } from "#schema";

/** Native weak-owner multicast event. JavaScript passes template method arguments explicitly. */
export class Tr2Event
{
  listeners = [];
  inBroadcast = false;

  /** Registers a weak owner and its unbound member function (Tr2Event.h:58-64). */
  @meta.adapted
  RegisterListener(owner, method)
  {
    if (this.inBroadcast) throw new Error("Trying to register a listener while broadcasting an event");
    this.Register(owner, method);
  }

  /** Unregisters one member, or all members of an owner (Tr2Event.h:78-105). */
  @meta.adapted
  UnregisterListener(owner, method)
  {
    if (this.inBroadcast) throw new Error("Trying to unregister a listener while broadcasting an event");
    if (method !== undefined) return this.Unregister(owner, method);
    const count = this.listeners.length;
    this.listeners = this.listeners.filter(entry => entry.owner.deref() !== owner);
    if (this.listeners.length === count) throw new Error("Trying to unregister an unregistered listener");
  }

  /** WeakRef substitutes for BlueWeakRefBase; JS keeps the dereferenced owner live during callbacks. */
  @meta.adapted
  Broadcast(...args)
  {
    this.inBroadcast = true;
    try
    {
      this.listeners = this.listeners.filter(entry => entry.owner.deref() !== undefined);
      for (const entry of this.listeners) Tr2Event.methodWrapper(entry.owner.deref(), entry.callback, ...args);
    }
    finally { this.inBroadcast = false; }
  }

  /** Explicit method argument replaces Carbon's template parameter (Tr2Event.h:148-151). */
  @meta.adapted
  static methodWrapper(owner, method, ...args)
  {
    return method.apply(owner, args);
  }

  /** JS has no const-qualified methods; Carbon's const wrapper calls the same member (h:157-160). */
  @meta.adapted
  static constMethodWrapper(owner, method, ...args)
  {
    return method.apply(owner, args);
  }

  /** Stores the native owner/callback pair; WeakRef replaces BlueWeakRefBase (Tr2Event.h:124-132). */
  @meta.adapted
  Register(owner, callback)
  {
    if (this.listeners.some(entry => entry.owner.deref() === owner && entry.callback === callback))
      throw new Error("Trying to register a listener already registered");
    this.listeners.push({ owner: new WeakRef(owner), callback });
  }

  /** Removes the matching native owner/callback pair (Tr2Event.h:135-143). */
  @meta.implemented
  Unregister(owner, callback)
  {
    const index = this.listeners.findIndex(entry => entry.owner.deref() === owner && entry.callback === callback);
    if (index === -1) throw new Error("Trying to unregister an unregistered listener");
    this.listeners.splice(index, 1);
  }
}
