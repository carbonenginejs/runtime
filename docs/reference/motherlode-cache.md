# MotherLode identity, cache, and retention

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource`  
Audience: Users and integrators  
Summary: Defines canonical resource identity, ownership and replacement, the recorded-byte cache, payload retention, read-cache provenance, and purge contracts.

## Canonical identity

Canonical resource identity is the normalized source path plus its promised
output tag. `variant` is the explicit tag; otherwise `emit`, `requirement`, or
`payload` supplies it. Human-readable identities are written as
`res:/ship.gr2@cmf`, although MotherLode uses an internal delimiter. Reader,
constructor, and format-option implementations never enter the key. CjsLibrary
chooses the promised output and ResMan executes the current setup-time format
registration for it.

Output selection is case-insensitive for identity and matching, but format
readers receive the canonical declared spelling (for example `cmfJson`). A
legacy direct object loader exposes only its unforced default; named output
variants belong on a format class. Unsupported `@output` requests fail before
cache lookup, so a resident handle cannot bypass the declaration.

The selected constructor, reader, and format defaults/options are setup-time
execution details, not MotherLode identity. A changed registration does not
create a hidden second resource; reset the affected identity
(`Delete`/`Clear`) or create a new manager. A changed output contract must use
a new tag such as `@cmf2`.

## Ownership and replacement

`CjsResMan` resolves each normalized path and promised output to one canonical
MotherLode key. `Insert(key, resource, options)` reports `{ inserted,
replaced, displaced }`; replacement, deletion, clearing, and shutdown destroy
attached adapter allocations and release the complete CPU payload by default.
Callers that deliberately retain ownership may pass `{ cleanup: false }` and
keep the returned displaced resource. If replacement cleanup fails, insertion
throws a contextual error and leaves the existing owner registered. These
ordinary ownership removals preserve the handle's last resource state;
`PURGED` is reserved for successful policy eviction through inactivity or
byte pressure.

`Startup()` and `Shutdown()` are idempotent. `HasKey`, `Lookup`, `Delete`,
`GetKeys`, `GetValues`, `GetSize`, `SetCacheSize`, `GetCacheSize`, `GetStats`,
`TrimCache`, `ReplaceExpected`, `Clear`, and `ClearCached` provide the
Carbon-shaped cache vocabulary plus the exact-owner compare-and-swap required
by staged JavaScript reload. The old `Has`, `GetCount`, and `DeleteAll` names
remain temporary compatibility aliases.

## Recorded-byte cache

Carbon can infer when only its cache retains a resource through
weak-reference and refcount transitions. JavaScript cannot reproduce that
ownership test reliably, so `CjsMotherLode` budgets only entries that a caller
explicitly classifies with `{ cached: true, bytes }`; JavaScript reachability
is never inferred. The byte value is an exact caller-supplied safe-integer
eviction weight, not a heuristic walk of the resource graph; runtime-resource
does not walk arbitrary cyclic/shared object graphs or invoke payload getters
to guess size.

Explicit cached entries receive a monotonic admission sequence. With default
cleanup, `TrimCache(options)` destroys adapters, releases payloads, detaches
lifecycle callbacks, marks compatible handles `PURGED`, and removes
positive-byte cached identities in oldest-admission order until
`cacheBytes <= cacheSize`. Live, locked, `cacheable: false`, and zero-byte
entries do not create pressure. `KeepAlive()` and `Lock()` promote a cached
record to live; `Unlock()` does not silently re-admit it.

`SetCacheSize(bytes, options)` installs and immediately enforces the new
budget. `CjsResMan.Update()` and `Tick()` retry cache housekeeping after
pumping queues; `{ cache: false }` skips it for one update without changing
policy. Cleanup is transactional per identity: a failed candidate remains
canonical, later candidates are still attempted, and the aggregate
`CJS_MOTHERLODE_CACHE_TRIM_FAILED` error carries successful evictions and any
remaining over-budget state. Trimming never reads, prepares, or reloads data.

## Payload retention

Reader and converter outputs are plain transient payload objects, not resource
classes or DTO models. A payload may contain more decoded data than a
particular resource or engine adapter needs. Each concrete resource validates
the fields it requires before publishing the payload and retains the scalars
and references it needs. An adapter may retain additional references in
adapter-owned state. Referencing payload-owned typed arrays is valid and
preferable to copying them merely to change ownership.

The lifecycle treats resource residency and payload residency independently:

```text
resource.KeepAlive()
    -> renew resource/cache residency

resource.KeepPayloadAlive()
    -> renew the attached payload lease

resource.ReleasePayload()
    -> explicitly release the full payload reference
```

`CjsResMan` binds resource-facing `KeepAlive()`, `KeepPayloadAlive()`,
`Lock()`, and `Unlock()` to the resource's canonical MotherLode key.
`SetPayload()` renews both identity and payload activity when it publishes a
non-null payload. `GetPayload()`, `HasPayload()`, `IsGood()`, and other
queries are pure; reading the payload does not implicitly renew its lease.
Detached and purged handles retain deterministic no-op liveness methods rather
than silently starting work.

A released CPU payload retains only the small request needed to reconstruct
that same path/output from its source and `sourceRevision`. The retained
promised-output fields and source provenance win over later
`Ready()`/`GetObject()` overrides, while cache/reload policy remains per-call.
Payload leases protect active consumers; an engine may release its own backend
adapter without destroying shared CPU data.

Both semantic and generic/base resource results use the payload slot: the
manager stores the complete result through `SetPayload()` and mirrors it on
the compatibility `object` property for base resources. Payload release clears
that alias only while it still identifies the released value. Semantic
resources continue to expose `object === resource` while holding their
validated plain payload privately.

Object-operation promises are retained only while in flight. Concurrent
`GetObject()`/`Ready()` calls share one operation; a resident result is
returned without source work and renews the explicit payload lease.
Settlement removes the operation record so its result graph can be reclaimed
and a failure can be retried. After payload release, only a new explicit
object/readiness call reconstructs it; queries, lease calls, and purge sweeps
do not.

The processor preparing a resource decides when the full payload can be
released:

```text
format reader -> plain payload -> resource validation + adapter prepare
                                   |
                                   +-> resource retains required values/references
                                   +-> adapter retains adapter-specific state/references
                                   +-> release payload after successful preparation
                                   `-> or renew its lease for deferred/further work
```

A time- or frame-based lease is a fallback against abandoned payloads. An
owner performing deferred work can renew the lease. If an expired payload is
required again, the caller must explicitly request reconstruction; lease
renewal and purging never fetch or reload source data. Dynamic or
non-reloadable resources must remain locked, retain the required payload, or
be able to recreate it.

Payload references are shared read-only by default. Preparing WebGL and
WebGPU adapters side by side should normally pass the same payload to both
consumers and retain it until both have finished. Copying is an explicit
consumer operation, justified when a consumer must mutate data, transfer and
detach an `ArrayBuffer`, or retain an independently writable snapshot. The
consumer should copy only the fields it requires; runtime-resource does not
automatically deep-clone payload or typed-array bundles.

## Read-cache provenance

Source and parsed-format caches use explicit provenance, separate from
path/output resource identity. `sourceRevision` is an opaque caller/source-
supplied string or finite number identifying source content for one source
object and normalized path. It scopes read caches only; it does not alter
MotherLode resource identity, and changing it does not replace a resident
payload without `reload: true`. Source and format records do not share across
revisions.

`cacheSource` and `cacheFormat` are tri-state per-call policies:

- omitted: share in-flight or explicitly retained work, then drop a newly
  completed record;
- `true`: share and retain success; a joining caller upgrades the record;
- `false`: bypass sharing and retention.

Failures are never retained. Format records are additionally isolated by
selected source object, frozen registration descriptor, revision, and
effective format options, so another source or a re-registered default cannot
reuse a stale parse. Re-registering a format with new defaults therefore
cannot reuse an old descriptor's parse. Registered defaults are copied into
deeply frozen plain-object/array snapshots. Material format options that
cannot be represented safely (for example class instances with hidden mutable
state) bypass format-cache sharing instead of risking a false match;
functions and byte views use cache-local identity plus visible byte content
where applicable.

A resource loader retains the effective selected source and `sourceRevision`
for reconstruction, including the manager default selected at creation, but
not cache flags or one-shot reload.

## Explicit and automatic purging

`PurgeInactive(options)` performs an explicit deterministic sweep using
independent identity and payload frame/time limits. Locks skip both forms of
eviction. Identity expiry destroys adapter resources, releases the payload,
detaches lifecycle callbacks, marks compatible handles `PURGED`, and removes
the canonical key; payload expiry calls `ReleasePayload()` while retaining
identity and adapter allocations. Candidate failures are aggregated after the
sweep has continued over other entries. A sweep never fetches, prepares, or
reloads a resource.

Automatic scheduling is available only when a caller supplies
`autoPurgePolicy` to the constructor/`Register()` or calls
`SetAutoPurgePolicy()`. It is disabled by default and deliberately accepts
only millisecond limits: MotherLode activity frames count explicit
observations and are not renderer frames. A policy must set at least one of
`maxIdleMilliseconds` or `payloadMaxIdleMilliseconds`;
`intervalMilliseconds` defaults to 1000. The first
`PumpAutoPurge()`/`Update()` after configuration sweeps immediately, then the
interval sets the minimum cadence. `Update({ purge: false })` suppresses a
sweep for one update without changing cadence. A regressing clock rebases and
skips one pump; custom deterministic clocks should be shared with MotherLode.
Recorded-byte cache trimming is separate from this opt-in inactivity policy
and runs on ordinary updates unless `{ cache: false }` is supplied.

```js
const resMan = new CjsResMan({
  source,
  autoPurgePolicy: {
    intervalMilliseconds: 1000,
    maxIdleMilliseconds: 60_000,
    payloadMaxIdleMilliseconds: 10_000
  }
});

resMan.Update();
```

Both queued `QueueResourceObject()` work and direct `LoadResourceObject()`
work hold one manager-owned lock from request/loading publication through
success or failure. The lock is balanced independently of caller locks, so
automatic or manual sweeps cannot detach a handle while its read/prepare
operation is still active. Lock release is conditional on the same captured
ownership generation, so stale work cannot decrement a newly rebound handle's
lock. Scheduling and active-work protection do not fetch or reload data.

Cache trimming and automatic inactivity sweeps retain the strict no-reload
rule. Application retention defaults, automatic resource/payload byte
estimation, separate CPU/adapter budgets, and purged-resource/device-loss
recovery policy are future work; see the [roadmap](../roadmap.md).

## Related documentation

- [Resource lifecycle concepts](../concepts/resource-lifecycle.md)
- [Candidate-first atomic reload](../reference/reload.md)
- [Queues and the Wait fence](../reference/queues.md)
