# Candidate-first atomic reload

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource`
Audience: Users and integrators  
Summary: Defines the reload contract that keeps the last published good handle canonical until a distinct candidate has fully succeeded.

## Contract

Reload is candidate-first. When an owner already exists,
`GetResource(path, { reload: true })` constructs and initializes a distinct
off-registry candidate without changing ordinary lookup. Calling `Ready()` on
that candidate, using `GetObject()` / `FetchResource()` with `reload: true`,
or calling the explicit `ReloadObject()` / `ReloadResource()` helpers starts
one shared candidate operation that runs the same queued contract:

1. purge-lock the exact former owner and invalidate reusable reads once;
2. read, convert through the selected format, and publish payload state only
   on the detached candidate;
3. require the newest per-key reload token and exact former ownership;
4. compare-and-swap the fully loaded CPU candidate into MotherLode;
5. invalidate and clean the displaced handle after the lookup switch.

The manager captures the exact MotherLode, key, former handle, former
ownership generation, and a newest-request token. Reader, prepare, and
publication stages mutate only the detached candidate and validate candidate
authority before and after asynchronous boundaries. A fully loaded CPU
candidate commits through `CjsMotherLode.ReplaceExpected()` only if the exact
former owner and newest token still match. The final authority callback and
exact-record check run immediately before the synchronous map switch, with no
user cleanup or `await` between the comparison and publication.

After the switch, the displaced ownership generation is invalidated, the
candidate receives ordinary lifecycle/reconstruction callbacks, and the former
handle is cleaned exactly once. Existing JavaScript references are not
retargeted; they keep the displaced handle, while fresh lookup sees the
committed candidate.

## Failure behavior

Source, format, or publication failure leaves the former handle, state,
payload, and adapters canonical; the failed candidate's attached payload and
adapters are cleaned and its original error is retained. An otherwise-
successful candidate that was superseded, deleted, cleared, or replaced
rejects with `CJS_RESMAN_STALE_RELOAD_CANDIDATE` and cannot resurrect the
key. Constructors that return the former singleton are rejected before
`Initialize()` can mutate it because staging requires a distinct handle.

Failed freshness attempts still invalidate reusable source/format records
when their work begins; the already-published canonical payload is not
dependent on those records.

Cleanup errors have explicit sides. Candidate cleanup failure aggregates with
the original preparation/stale error as
`CJS_RESMAN_RELOAD_CANDIDATE_CLEANUP_FAILED` while the former owner remains
canonical. A displaced-owner cleanup failure occurs after publication and
rejects as `CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED`, whose result explicitly
reports `committed: true`; the already-good candidate remains canonical.

## Read-cache interaction

`reload: true` synchronously detaches every queued/source/format read record
for the selected source/path before fresh work starts. Existing consumers
keep their detached promises; reload does not abort them. Fresh success
repopulates only caches explicitly requested with `cacheSource: true` or
`cacheFormat: true`. `InvalidateReadCache(path, { source, sourceRevision })`
provides the same no-abort invalidation explicitly; omitting
`sourceRevision` removes all revisions for that source/path. `Delete()`
remains canonical resource-identity-only, while `Clear()` resets all read
ledgers. A failed reload preserves the former payload but does not restore
reusable read-cache entries detached by its explicit freshness request.

## Publication authority and staleness

Every queued, direct, standalone, and candidate resource preparation captures
an immutable publication authority: the exact MotherLode, canonical key,
resource handle, and a manager-local ownership generation. The manager
validates that authority before and after state changes, asynchronous
reader/format work, and publication. Delete, Clear, successful reload commit,
or exact-handle reinsertion therefore makes older work reject with
`CJS_RESMAN_STALE_RESOURCE_OPERATION` before it can enter another state or
publish. If stale work independently rejects, its original source/format
error is preserved and `SetError()` is suppressed on the detached handle.

Candidate work is a normal `Wait()` root and blocks synchronous MotherLode
replacement while active. `Register({ motherLode })` rejects with
`CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS` while queued or direct mutations are
active, including a reload candidate. Normal `Wait()` drains queued roots and
candidate lineages; a direct caller must await its own load/prepare promise
before retrying replacement. Canonical and candidate authority prevent late
publication, but started source or format work is not yet aborted;
deterministic cleanup applies to the staged candidate resource itself.

## Divergence from Carbon

This availability contract intentionally differs from Carbon.
`BlueAsyncRes::Reload` cancels/joins work, releases dependent cached data, and
reloads the same canonical object in place; failure can therefore leave that
stable handle bad. Carbon MotherLode replacement also switches immediately and
has no prepare-success gate or rollback. The resource layer instead preserves
the last published good handle until a distinct candidate has succeeded, and
never silently retargets existing JavaScript references.

## Related documentation

- [MotherLode identity, cache, and retention](motherlode-cache.md)
- [Queues and the Wait fence](queues.md)
