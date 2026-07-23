# Event emitter contract

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource`  
Audience: Users and integrators  
Summary: Defines the `CjsEventEmitter` API surface used by resource managers and the memory rules that keep listeners from leaking graphs.

## Purpose

`CjsEventEmitter` (from `core-types/model`) is a separate base class so
non-model runtime services can emit events without extending `CjsModel`;
`CjsResMan` uses that path. CarbonEngineJS exposes one small event-emitter API
and avoids short generic names such as `On`, `Once`, `Off`, and `Emit` on
Carbon-shaped classes. There is no separate resource notification/callback
compatibility layer beside events, and no listener scopes, subscription
handles, or owner-side `ListenTo()` helpers.

## API

- `AddEvents(events)`
- `OnEvent(eventName, listener, source?)`
- `OnceEvent(eventName, listener, source?)`
- `OffEvent(eventName = "*", listener?, source?)`
- `EmitEvent(eventName, ...args)`
- `HasEvent(eventName = "*", listener?, source?)`
- `ClearEvent(eventName = "*")`
- `GetEventNames()` and `GetEventListenerCount(eventName = "*")`

The optional `source` is the callback's `this` value and an explicit matching
identity for removal. Mutating event methods return the emitter for chaining.
Event names are normalized to lowercase and dispatched by exact match.
Wildcard names are accepted only by lookup and cleanup methods; there is no
wildcard listener dispatch, no `family.event` or ancestor routing, and no
event payload history. Resource classes may emit their own state or domain
events, but the emitter does not invent a resource lifecycle contract.

## Memory rules

Event storage is the optional `events` member of the emitter's non-enumerable
`__state` object:

```text
emitter.__state (non-enumerable, allocated only when some subsystem needs it)
  events -> eventName -> Set<listenerRecord>

listenerRecord
  emitter
  eventName
  listener
  source
  once
```

The event map is created only when the first listener is registered and
deleted when the last record is removed. That does not make listeners weak:
as long as an emitter is reachable, its event map strongly references
listener functions and sources, and those listeners can keep whole
scene/resource graphs alive. The contract is therefore:

- `OnceEvent()` removes the listener on first dispatch, even if the callback
  throws.
- `OffEvent(eventName, listener, source)` removes the exact listener/source
  entry; `target.OffEvent("*", null, source)` removes all of a source's
  records. An external party that no longer observes a target must call
  `OffEvent()`.
- `Unload()` and `Purge()` are resource state/cache operations, not an
  implied listener-destruction lifecycle.
- `OnEvent()` returns the emitter; it does not return unsubscribe closures,
  because those closures create another reference path.
- Deterministic cleanup is the contract; `WeakRef`/`FinalizationRegistry` may
  help diagnostics but are not a lifecycle mechanism.

Multiple listeners on the same event are allowed because each event bucket is
a set of records. A raw `CjsEventEmitter` does not gain model-owned `dirty`
or `rebuild` state. The target is "easy to debug, hard to leak": clear
ownership of who subscribed, who unsubscribes, and which cleanup phase clears
remaining listeners.

## Relationship to model dirty state

`CjsModel` has dirty-state helpers (`MarkDirty`, `ClearDirty`, `ConsumeDirty`,
`GetDirtyNotifications`) for model invalidation. `SetValues()` compares
incoming values with the current field values and only marks dirty when a
value actually changes. A plain `MarkDirty()` means broad dirty invalidation;
it does not request a rebuild, and deferred rebuild reasons belong to the
independent `model.__state.rebuild` set. That model machinery is not a
resource lifecycle event system; resource lifecycle events remain a
resource/resman concern.

## Related documentation

- [MotherLode identity, cache, and retention](motherlode-cache.md)
