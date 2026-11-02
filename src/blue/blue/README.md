# Blue service composition

`blue` is the process-wide `CjsBlue` holder. Its constructor creates local defaults
without registering ticks, starting workers, fetching data or touching a device.
Class declarations and enums use the existing shared registries. The SOF slot
starts null; the audio slot holds the dependency-light silent engine from
`global/audio`. Real SOF and playback implementations stay above this layer.

`CjsLibrary.Initialize` installs preconfigured, borrowed providers. The internal
`installBlueServices` transaction first validates all supplied slots, registers
the candidate resource manager/clock pair, detaches the old pair, then publishes
the slots. Its private tick cookie preserves unrelated host registrations.
Changing only paths, SOF or audio does not touch ticks. Failed hooks run inverse
operations; the original error is retained, with failed compensation reported in
an AggregateError. Publication happens only after successful transfer.

The prior references and activation state form a restoration snapshot. Restoring
an unstarted holder detaches the active pair without activating the defaults.
Shutdown does not destroy borrowed providers or undo their own configuration.
The host still owns pumping the clock; startup only registers its recipient.

`CjsBlue.Fetch` forwards DNA to SOF and other requests to ResMan, preserving options
and results. It does not load catalogs or initialize resource dependencies itself.
Missing SOF reports "SOF is not configured". Dynamic resource constructors remain
registered with ResMan; they are not additional Blue slots.

## Resource lifetime

Concrete resources inherit `BlueAsyncRes`. Their native load and prepare hooks
retain family data on the owner: bitmaps, mesh/Granny projections, animation
state, effect readers and audio backing bytes. Each resource also holds its own
load state: the request options, the current attempt and its promise, the last
failure, and purge with its revival count. The global `blue.resMan` drives that
state; `GetResourceStatus` reads it and derives `phase` from it. No resource
stores a manager attachment or a bundle of callbacks back into its manager.

`GetResource(path, { ex })` selects by extension plus Carbon's suffix, initializes
the handle and then inserts it into MotherLode. `Ready(resource)` waits for the
current attempt. Reload and purge revival refill that same handle. Failed loads
are prepared but not good; `EnsureGood()` and `KeepAlive()` do not retry them. Only an
explicit reload retries failure. A policy purge can revive on use within the
manager's retry cap. `GetResourceStatus` inspects flags without renewing use.

`IsGood()` only asks: it returns the native good flag and renews nothing.
`EnsureGood()` renews use (`KeepAlive()`), then answers `IsGood()`; call it
where the resource is about to be used. This timestamp renewal stands in for
Carbon's reference lifetime; it does not imply success.

Owners pull a resource's changes at use instead of registering notify targets.
Each resource counts its finished prepares in `_revision`. An owner records,
per dependency slot, the revision it built from in its own
`_dependencyRevisions` Map, and calls
`BlueAsyncRes.ensureDependency(dependency, owner, slotKey)` at draw readiness:
it renews the dependency, calls the owner's `RebuildCachedData(dependency)`
when the revision changed, and `ReleaseCachedData(dependency)` once when the
dependency is no longer good. Nothing holds the owner. `AddNotifyTarget` and
`RemoveNotifyTarget` are kept for Carbon parity and throw.

The internal `CjsLoadingObject` retains decoded plain data or a cached builder
through the manager. `LoadObject` constructs a fresh graph per caller and does
not expose that handler. `GetResourcePayload`, `HasResourcePayload` and
`ReleaseResourcePayload` apply only to plain/object data. Family data is read
through its native owner, such as `GetBitmap` or `GetCMFData`. Releasing plain
data preserves handle identity; the next explicit `Ready` reconstructs it.

Full MotherLode cleanup cancels an attempt and calls the owner's cleanup hook;
owners release their derived data at their next use. Its existing `releasePayload` and
`destroyAdapters` switches remain independent. Device-only release and
plain-data expiry have narrower scopes than full resource cleanup.
