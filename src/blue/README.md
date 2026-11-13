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
are prepared but not good; `IsGood()` and `KeepAlive()` do not retry them. Only an
explicit reload retries failure. A policy purge can revive on use within the
manager's retry cap. `GetResourceStatus` inspects flags without renewing use.

`IsGood(owner)` renews use (`KeepAlive()`), renews that owner's registered links,
then returns the native good flag. Omit the owner to renew only the resource.
Check every dependency independently so a bad first dependency does not prevent
later dependencies from renewing. This timestamp renewal stands in for Carbon's
reference lifetime; it does not imply success. The former `EnsureGood()` alias
is removed; callers use `IsGood()`.

`resMan.notify` provides `Add(owner, resource, holder, key)` and
`Remove(owner, resource)`. Registration immediately rebuilds prepared
resources. Load/reload dispatches `RebuildCachedData(resource)`; reload and failure
dispatch `ReleaseCachedData(resource)`. Unrenewed links expire in `PurgeInactive`:
remove the owner/resource links, then call the owner's `RemoveCachedData(resource)`
to release derived data and clear matching slots. Expiry drops resources, never
paths: a Map slot keeps its key, and the owner reloads at use. Registered-owner
contract tests verify slot clearing and replacement preservation; expiry does not
recheck or repair slots. Callback errors propagate immediately, so later callbacks
wait for another invocation. Explicit teardown must still remove links.
`GetByOwner` and `GetByResource` return diagnostic snapshots. Resource owners now
have link-only `OnDestruct` hooks; the full destructor port and generic caller are
separate work, so these hooks are not yet the complete teardown entry point.
`linkExpirySeconds` sets how long an unrenewed link lives, and otherwise it follows
the inactivity policy. This manager ownership is provisional until destruction can
reliably unregister targets.

`Tr2Effect` registers through its resource property setter, removes links on
replacement/destruction, and checks readiness before rendering. Expired internal
acquisitions are reacquired on use. `Tr2Mesh` and `Tr2SkinnedModel` likewise register
their geometry properties, receive completion callbacks, and reacquire cleared
path-owned resources on use. Destroyed owners do not reacquire. `Tr2GrannyAnimation`
registers its primary resource property and secondary-resource map entries.
Its release callback cleans layer sampling references and pose data while
retaining resource slots for reload; expiry then removes those slots. Layer
configuration survives cleanup. After secondary release, explicit initialization
rebuilds the rig; secondary completion alone does not rebuild it, matching the
native callback's early return. `EveTrailsSet`, `EveTurretSet` and
`Tr2GrannyPrimitiveSet` also register geometry properties, renew on use and
reacquire expired path-owned resources unless destroyed. Granny primitive
rebinding retains cached geometry until replacement completion; release callbacks
clear it. The obsolete `ensureDependency` helper and resource/atlas revision
counters have been removed; manager notifications drive owner updates. Resource-local
`AddNotifyTarget` and `RemoveNotifyTarget` have been removed from resources;
use the manager-owned methods above.

The internal `CjsLoadingObject` retains decoded plain data or a cached builder
through the manager. `LoadObject` constructs a fresh graph per caller and does
not expose that handler. `GetResourcePayload`, `HasResourcePayload` and
`ReleaseResourcePayload` apply only to plain/object data. Family data is read
through its native owner, such as `GetBitmap` or `GetCMFData`. Releasing plain
data preserves handle identity; the next explicit `Ready` reconstructs it.

Full MotherLode cleanup cancels an attempt, expires registered owner links, and
calls the resource's cleanup hook, which destroys its adapter allocations and
releases its payload. Legacy pull-based owners release their derived data at
their next use. Device-only release and plain-data expiry have narrower scopes
than full resource cleanup.
