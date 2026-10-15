import { CjsSchema, meta, blue } from "#schema";
import { ResourceRequirement } from "../consts/resourceRequirement.js";
import { assertNonNegativeInteger, assertNonNegativeNumber } from "#utils/validation";

// Source: blue/include/IMotherLode.h
// Source: blue/src/MotherLode.h
// Source: blue/src/MotherLode.cpp
import { normalizeResourcePath } from "#utils/path";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { ICacheable } from "./ICacheable.js";
import { IRoot } from "./IRoot.js";

/** mMaxMemUsage's initial value (MotherLode.cpp:44). */
const DEFAULT_CACHE_SIZE = 32 * 1024 * 1024;

/**
 * `CjsBlueClasses.BLUEQIOPT.BEQI_SILENT`, written out because importing
 * CjsBlueClasses reaches CjsBlue, which builds the resMan that owns this registry.
 */
const BEQI_SILENT = 0x1;

/**
 * Construction options for {@link CjsMotherLode}.
 *
 * @typedef {object} CjsMotherLodeOptions
 * @property {() => number} [now] Returns a non-negative timestamp for activity diagnostics.
 * @property {number} [cacheSize] Initial byte budget for cached entries.
 */

/**
 * Cleanup policy accepted by ownership-removal operations.
 *
 * @typedef {object} CjsMotherLodeMutationOptions
 * @property {false|Function} [cleanup] `false` retains ownership; a function replaces default cleanup.
 * @property {boolean} [destroyAdapters=true] Whether default cleanup destroys adapter allocations.
 * @property {boolean} [releasePayload=true] Whether default cleanup releases the complete CPU payload.
 */

/**
 * Canonical insertion and record-metadata options.
 *
 * @typedef {CjsMotherLodeMutationOptions & object} CjsMotherLodeInsertOptions
 * @property {boolean} [replace=true] Whether an existing different resource may be displaced.
 * @property {string} [variant] Variant used only by the legacy resource-first insertion form.
 * @property {boolean} [cacheable=true] Carbon's `allowCaching` (`IMotherLode::CACHING_ALLOWED`):
 *   whether the entry may enter the cache once unused, if its class is `ICacheable`.
 * @property {number} [frame] Explicit non-negative activity frame; otherwise the counter advances.
 * @property {number} [time] Explicit non-negative activity timestamp; otherwise `now()` is called.
 */

/**
 * Exact-owner conditional replacement options.
 *
 * @typedef {CjsMotherLodeInsertOptions & object} CjsMotherLodeConditionalReplaceOptions
 * @property {() => boolean} [commitGuard] Final side-effect-free caller authority check performed immediately before the exact-record comparison.
 */

/**
 * Explicit inactivity-sweep policy for {@link CjsMotherLode#PurgeInactive}.
 * At least one identity or payload limit must be supplied for work to occur.
 * When both frame and time limits exist, reaching either limit is sufficient.
 *
 * @typedef {CjsMotherLodeMutationOptions & object} CjsMotherLodePurgeOptions
 * @property {number} [frame] Current non-negative activity frame; otherwise the registry advances once.
 * @property {number} [time] Current non-negative timestamp in milliseconds; otherwise `now()` is called.
 * @property {number} [maxIdleFrames] Frames after which an unlocked identity is removed and cleaned.
 * @property {number} [maxIdleMilliseconds] Milliseconds after which an unlocked identity is removed and cleaned.
 * @property {number} [payloadMaxIdleFrames] Frames after which an unlocked CPU payload is released.
 * @property {number} [payloadMaxIdleMilliseconds] Milliseconds after which an unlocked CPU payload is released.
 */

/**
 * Result from one explicit inactivity sweep.
 *
 * @typedef {object} CjsMotherLodePurgeResult
 * @property {number} frame Sweep activity frame.
 * @property {number} time Sweep timestamp in milliseconds.
 * @property {number} purged Number of canonical identities removed and cleaned.
 * @property {number} payloadsReleased Number of payloads released while retaining their identities.
 * @property {number} cached Number of expired identities that entered the cache instead of being purged.
 * @property {number} locked Number of locked identities skipped by the sweep.
 * @property {readonly string[]} purgedKeys Canonical identities removed by the sweep.
 * @property {readonly string[]} payloadKeys Canonical identities whose payload lease expired.
 * @property {readonly string[]} cachedKeys Canonical identities that entered the cache.
 */

/**
 * Result from one cache housekeeping pass (`MotherLode::Housekeeping`).
 *
 * Cached entries count their `ICacheable.GetMemoryUsage`; an entry whose size
 * is still pending counts nothing until it is known.
 *
 * @typedef {object} CjsMotherLodeCacheTrimResult
 * @property {number} cacheSize Configured byte budget.
 * @property {number} beforeBytes Cached bytes once pending sizes were settled, before trimming.
 * @property {number} afterBytes Cached bytes after housekeeping.
 * @property {number} evictedBytes Cached bytes removed successfully.
 * @property {boolean} overBudget Whether retained cached records still exceed the budget.
 * @property {number} evicted Number of complete canonical identities removed, including
 *   pending entries whose known size could not be cached.
 * @property {number} failed Number of candidate identities that reported cleanup or purge-state failure.
 * @property {readonly string[]} evictedKeys Canonical identities removed oldest-first.
 * @property {readonly string[]} failedKeys Canonical identities that reported a failure.
 */

/**
 * Activity-update options accepted by {@link CjsMotherLode#KeepAlive}.
 *
 * @typedef {object} CjsMotherLodeActivityOptions
 * @property {number} [frame] Explicit non-negative activity frame; otherwise the counter advances.
 * @property {number} [time] Explicit non-negative activity timestamp; otherwise `now()` is called.
 */

/**
 * Result returned by {@link CjsMotherLode#Insert}.
 *
 * @typedef {object} CjsMotherLodeInsertResult
 * @property {string} key Canonical resolved identity key.
 * @property {object|Function} resource Resource that owns the canonical identity after the call.
 * @property {boolean} inserted Whether the supplied resource was newly registered.
 * @property {boolean} replaced Whether a different registered resource was displaced.
 * @property {object|Function|null} displaced Previous resource returned after successful cleanup or retention.
 */

/**
 * Result from an exact-owner conditional replacement.
 *
 * @typedef {object} CjsMotherLodeConditionalReplaceResult
 * @property {string} key Canonical resolved identity key.
 * @property {boolean} committed Whether the expected owner was replaced.
 * @property {object|Function|null} resource Canonical resource after the compare-and-swap attempt.
 * @property {object|Function|null} displaced Former exact owner when the replacement committed.
 */

/**
 * Diagnostic snapshot returned by {@link CjsMotherLode#GetStats}.
 *
 * @typedef {object} CjsMotherLodeStats
 * @property {number} count Compatibility identity count.
 * @property {number} size Canonical identity count.
 * @property {number} live Number of entries in use (not cached).
 * @property {number} cached Number of cached entries, pending ones included.
 * @property {number} locked Number of entries with at least one eviction lock.
 * @property {number} payloads Number of entries currently retaining a CPU payload.
 * @property {number} bytes Memory use reported by cached entries (Carbon's `c_mem`).
 * @property {number} cacheBytes The same total, kept under its former name.
 * @property {number} cacheSize Configured byte budget.
 * @property {number} activityFrame Highest activity frame observed by this registry.
 * @property {Readonly<Record<string, number>>} states Resource count grouped by state name.
 * @property {readonly string[]} paths Unique resource paths in encounter order.
 */

/**
 * Strong, deterministic JavaScript resource registry.
 *
 * Carbon moves a resource from weak live registration into a strong LRU cache
 * when its last reference goes (`WeakRefNotify`, MotherLode.cpp:329-401).
 * JavaScript cannot see references go, so an inactivity sweep's expiry stands
 * in for it: an expired entry whose class maps `ICacheable` enters the cache,
 * sized by its own `GetMemoryUsage`, and `TrimCache` drops the oldest while the
 * total is over budget. Every other expired entry is purged. Use takes an
 * entry back out of the cache, as Carbon's `Lookup` does (:149-157).
 */
export class CjsMotherLode
{

  _active = false;
  _activityFrame = 0;
  _cacheSize = DEFAULT_CACHE_SIZE;
  _entries = new Map();
  _nextCacheSequence = 1;
  _now = defaultNow;

  /**
   * Create an active deterministic resource registry.
   *
   * @param {CjsMotherLodeOptions} [options={}] Clock and recorded-byte cache configuration.
   * @throws {TypeError} If options, the clock, or the cache byte budget are invalid.
   */
  constructor(options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("CjsMotherLode options must be an object.");
    }
    if (options.now !== undefined)
    {
      if (typeof options.now !== "function")
      {
        throw new TypeError("CjsMotherLode now must be a function.");
      }
      this._now = options.now;
    }
    if (options.cacheSize !== undefined)
    {
      this.SetCacheSize(options.cacheSize);
    }
    this.Startup();
  }

  /**
   * Activate resource registration without changing existing entries.
   * Repeated calls are idempotent.
   *
   * @returns {CjsMotherLode} This registry.
   */
  Startup()
  {
    this._active = true;
    return this;
  }

  /**
   * Stop registration and deterministically remove every owned entry.
   * Default cleanup destroys attached adapter allocations and releases CPU
   * payloads. Repeated calls are idempotent after a successful cleanup.
   *
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy applied to every entry.
   * @returns {CjsMotherLode} This inactive registry.
   * @throws {AggregateError} If cleanup fails for one or more entries; registration is still stopped.
   */
  Shutdown(options = {})
  {
    try
    {
      this.Clear(options);
    }
    finally
    {
      this._active = false;
    }
    return this;
  }

  /**
   * Return whether new resources may currently be inserted.
   *
   * @returns {boolean} `true` between `Startup()` and `Shutdown()`.
   */
  IsStarted()
  {
    return this._active;
  }

  /**
   * Insert a canonical key and report whether an existing owner was displaced.
   *
   * The legacy `Insert(resource, path, variant)` form remains accepted while
   * ResMan and consumers migrate to `Insert(key, resource, options)`.
   * Cleanup completes before canonical ownership changes, so a cleanup error
   * leaves the previous resource registered and the supplied resource owned by
   * its caller.
   *
   * @param {string|object|Function} keyOrResource Canonical key, or the legacy resource object.
   * @param {object|Function|string} resourceOrPath Resource object, or the legacy source path.
   * @param {CjsMotherLodeInsertOptions|string} [optionsOrVariant={}] Insertion options, or legacy variant.
   * @returns {CjsMotherLodeInsertResult} Canonical ownership result.
   * @throws {TypeError} If the key, resource, metadata, or activity values are invalid.
   * @throws {Error} If the registry is inactive or displaced-resource cleanup fails.
   */
  Insert(keyOrResource, resourceOrPath, optionsOrVariant = {})
  {
    if (!this._active)
    {
      throw motherLodeInactiveError();
    }

    const { key, resource, options } = normalizeInsertArguments(
      keyOrResource,
      resourceOrPath,
      optionsOrVariant
    );
    assertResource(resource);

    const existing = this._entries.get(key) || null;
    if (existing && existing.resource === resource)
    {
      const updated = { ...existing };
      this._UpdateRecord(updated, options);
      this._TouchRecord(updated, options);
      Object.assign(existing, updated);
      return createInsertResult(key, resource, false, false, null);
    }
    if (existing && options.replace === false)
    {
      return createInsertResult(key, existing.resource, false, false, null);
    }

    const record = this._CreateRecord(key, resource, options);

    if (existing)
    {
      this._CleanupRecord(existing, options, "replace", true);
    }
    this._entries.set(key, record);

    return createInsertResult(key, resource, true, Boolean(existing), existing?.resource || null);
  }

  /**
   * Replace one exact canonical owner without running user cleanup between the
   * final ownership comparison and registry publication.
   *
   * The prepared replacement becomes canonical first; displaced-owner cleanup
   * then runs exactly once. A cleanup failure therefore cannot roll lookup
   * ownership back to a partially cleaned former resource. Such a failure is
   * reported as `CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED` with a committed
   * result attached. When the expected owner is no longer current, no mutation
   * or cleanup occurs and `committed` is `false`.
   *
   * Cacheability inherits from the expected record unless explicitly
   * supplied. The replacement is live because a successful staged reload is
   * an activity observation.
   *
   * @param {string} key Canonical resolved identity key.
   * @param {object|Function} expected Exact resource that must still own `key`.
   * @param {object|Function} resource Fully prepared replacement resource.
   * @param {CjsMotherLodeConditionalReplaceOptions} [options={}] Replacement metadata, authority guard, and displaced-owner cleanup policy.
   * @returns {CjsMotherLodeConditionalReplaceResult} Compare-and-swap outcome.
   * @throws {TypeError} If the key, resources, metadata, or activity values are invalid.
   * @throws {Error} If the registry is inactive or the prepared resource aliases the expected owner.
   * @throws {AggregateError} After a committed swap when displaced-owner cleanup fails.
   */
  ReplaceExpected(key, expected, resource, options = {})
  {
    if (!this._active)
    {
      throw motherLodeInactiveError();
    }

    const resolvedKey = normalizeResolvedKey(key);
    const policy = normalizeOptions(options, "conditional replace");
    if (policy.commitGuard !== undefined && typeof policy.commitGuard !== "function")
    {
      throw new TypeError("CjsMotherLode conditional replace commitGuard must be a function.");
    }
    assertResource(expected);
    assertResource(resource);
    if (resource === expected)
    {
      const error = new Error("CjsMotherLode conditional replacement requires a distinct resource.");
      error.code = "CJS_MOTHERLODE_REPLACE_ALIAS";
      throw error;
    }

    const existing = this._entries.get(resolvedKey) || null;
    if (!existing || existing.resource !== expected)
    {
      return createConditionalReplaceResult(
        resolvedKey,
        false,
        existing?.resource || null,
        null
      );
    }

    const recordOptions = {
      ...policy,
      cacheable: policy.cacheable === undefined ? existing.cacheable : policy.cacheable
    };
    const record = this._CreateRecord(resolvedKey, resource, recordOptions);

    // Re-check after clock/metadata validation, then publish with no user code
    // between the exact-record comparison and Map mutation.
    if ((policy.commitGuard && !policy.commitGuard())
      || this._entries.get(resolvedKey) !== existing)
    {
      return createConditionalReplaceResult(
        resolvedKey,
        false,
        this._entries.get(resolvedKey)?.resource || null,
        null
      );
    }
    this._entries.set(resolvedKey, record);

    const result = createConditionalReplaceResult(resolvedKey, true, resource, expected);
    try
    {
      this._CleanupRecord(existing, policy, "conditional replace");
    }
    catch (cause)
    {
      const error = new AggregateError(
        [ cause ],
        `CjsMotherLode conditional replacement committed but cleanup failed for ${resolvedKey}.`
      );
      error.code = "CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED";
      error.result = result;
      throw error;
    }
    return result;
  }

  /**
   * Test a canonical identity without loading or renewing its activity.
   * Supplying `variant` retains compatibility with the former path-first API.
   *
   * @param {string} key Canonical resolved key, or normalized source path with `variant`.
   * @param {string} [variant] Optional promised-output variant.
   * @returns {boolean} Whether the resolved identity is registered.
   * @throws {TypeError} If the identity cannot be normalized.
   */
  HasKey(key, variant = undefined)
  {
    return this._entries.has(normalizeLookupKey(key, variant));
  }

  /**
   * Return a canonical resource without loading or renewing its activity.
   * Supplying `variant` retains compatibility with the former path-first API.
   *
   * @param {string} key Canonical resolved key, or normalized source path with `variant`.
   * @param {string} [variant] Optional promised-output variant.
   * @returns {object|Function|null} Registered resource, or `null` when absent.
   * @throws {TypeError} If the identity cannot be normalized.
   */
  Lookup(key, variant = undefined)
  {
    return this._entries.get(normalizeLookupKey(key, variant))?.resource || null;
  }

  /**
   * Remove one canonical identity and clean its manager-owned payloads.
   *
   * `Delete(path, variant)` remains accepted for compatibility.
   *
   * @param {string} key Canonical resolved key, or normalized source path with a variant.
   * @param {string|CjsMotherLodeMutationOptions} [variantOrOptions] Compatibility variant or cleanup policy.
   * @param {CjsMotherLodeMutationOptions} [maybeOptions] Cleanup policy when a variant is supplied.
   * @returns {boolean} Whether an entry was removed.
   * @throws {TypeError} If identity or cleanup options are invalid.
   * @throws {Error} If resource cleanup fails after the identity is removed.
   */
  Delete(key, variantOrOptions = undefined, maybeOptions = undefined)
  {
    const { resolvedKey, options } = normalizeDeleteArguments(key, variantOrOptions, maybeOptions);
    const record = this._entries.get(resolvedKey);
    if (!record) return false;

    this._entries.delete(resolvedKey);
    this._CleanupRecord(record, options, "delete");
    return true;
  }

  /**
   * Remove every promised-output variant for one normalized source path.
   * All matching identities are forgotten before cleanup begins.
   *
   * @param {string} path Source resource path whose canonical variants are removed.
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for removed resources.
   * @returns {boolean} Whether at least one variant was removed.
   * @throws {TypeError} If the path is invalid.
   * @throws {AggregateError} If cleanup fails for one or more removed resources.
   */
  DeleteAllVariants(path, options = {})
  {
    const normalizedPath = normalizePath(path);
    const prefix = `${normalizedPath}\u0000`;
    const records = [];

    for (const [ key, record ] of this._entries)
    {
      if (key === normalizedPath || key.startsWith(prefix))
      {
        records.push(record);
        this._entries.delete(key);
      }
    }

    this._CleanupRecords(records, options, "delete variants");
    return records.length > 0;
  }

  /**
   * Deterministically remove and clean every owned identity while preserving
   * the registry's active/inactive lifecycle state.
   *
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for removed resources.
   * @returns {CjsMotherLode} This empty registry.
   * @throws {AggregateError} If cleanup fails for one or more removed resources.
   */
  Clear(options = {})
  {
    const records = [ ...this._entries.values() ];
    this._entries.clear();
    this._CleanupRecords(records, options, "clear");
    return this;
  }

  /**
   * Remove every cached entry, pending ones included (`MotherLode::ClearCached`,
   * MotherLode.cpp:433-449).
   *
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for removed cache entries.
   * @returns {number} Number of entries removed before cleanup.
   * @throws {AggregateError} If cleanup fails for one or more removed resources.
   */
  ClearCached(options = {})
  {
    const records = [];
    for (const [ key, record ] of this._entries)
    {
      if (record.cached && record.lockCount === 0)
      {
        records.push(record);
        this._entries.delete(key);
      }
    }
    this._CleanupRecords(records, options, "clear cached");
    return records.length;
  }

  /**
   * Record explicit use and promote an explicitly cached entry to live.
   * The overload `KeepAlive(path, variant, options)` remains available while
   * callers migrate to canonical keys.
   *
   * @param {string} key Canonical resolved key, or normalized source path with a variant.
   * @param {string|CjsMotherLodeActivityOptions} [variantOrOptions] Compatibility variant or activity values.
   * @param {CjsMotherLodeActivityOptions} [maybeOptions] Activity values when a variant is supplied.
   * @returns {object|Function|null} Renewed resource, or `null` when absent.
   * @throws {TypeError} If identity or activity values are invalid.
   */
  KeepAlive(key, variantOrOptions = undefined, maybeOptions = undefined)
  {
    const { resolvedKey, options } = normalizeActivityArguments(key, variantOrOptions, maybeOptions);
    const record = this._entries.get(resolvedKey);
    if (!record) return null;
    Uncache(record);
    this._TouchRecord(record, options);
    return record.resource;
  }

  /**
   * The registry clock's current time, which the manager stamps once per tick
   * for resources to renew with (`CjsResource.activityTime`).
   *
   * @returns {number} Milliseconds on this registry's clock.
   */
  GetActivityTime()
  {
    return this._now();
  }

  /**
   * Fold renewals that resources stamped on themselves into their records,
   * exactly as `KeepAlive` would have applied them at the time: the record's
   * last-used time advances and the entry is promoted out of the byte cache.
   * Runs before anything decides on activity - the inactivity sweep and an
   * over-budget cache trim - so those see every renewal. Frame counts are not
   * advanced: the manager configures time limits only.
   *
   * Ours: see `CjsResource.KeepAlive`.
   */
  _SettleRenewals()
  {
    for (const record of this._entries.values())
    {
      const resource = record.resource;
      const renewed = resource ? resource._lastUsedTime : undefined;
      if (typeof renewed !== "number" || !(renewed > record.lastUsedTime)) continue;
      record.lastUsedTime = renewed;
      Uncache(record);
    }
  }

  /**
   * `KeepAlive` for a key this registry produced, without normalizing it again.
   *
   * Ours: the manager's per-resource lifecycle controller renews through this
   * on every `CjsResource.IsGood()`, which every draw path calls each frame.
   * Normalizing an already canonical key was about three quarters of
   * `KeepAlive`'s cost (216 of 587 ns a call, measured 2026-10-04); a direct
   * map get is about 6 ns. A key that misses falls back to `KeepAlive`, so a
   * non-canonical key behaves exactly as before.
   *
   * @param {string} key Canonical resolved key.
   * @param {CjsMotherLodeActivityOptions} [options] Activity values.
   * @returns {object|Function|null} Renewed resource, or `null` when absent.
   */
  _KeepAliveCanonical(key, options)
  {
    const record = this._entries.get(key);
    if (!record) return this.KeepAlive(key, options);
    Uncache(record);
    this._TouchRecord(record, options ?? EMPTY_ACTIVITY);
    return record.resource;
  }

  /**
   * `Lookup` for a key this registry produced, without normalizing it again;
   * a miss falls back to `Lookup`. See `_KeepAliveCanonical`.
   *
   * @param {string} key Canonical resolved key.
   * @returns {object|Function|null} The resource, or `null` when absent.
   */
  _LookupCanonical(key)
  {
    const record = this._entries.get(key);
    return record ? record.resource || null : this.Lookup(key);
  }

  /**
   * Explicitly renew both canonical identity activity and the attached CPU
   * payload lease. The resource-facing `KeepPayloadAlive()` method delegates
   * here when CjsBlueResMan owns the handle. No payload is read or created.
   *
   * @param {string} key Canonical resolved key, or normalized source path with a variant.
   * @param {string|CjsMotherLodeActivityOptions} [variantOrOptions] Compatibility variant or activity values.
   * @param {CjsMotherLodeActivityOptions} [maybeOptions] Activity values when a variant is supplied.
   * @returns {object|Function|null} Renewed resource, or `null` when absent.
   * @throws {TypeError} If identity or activity values are invalid.
   */
  KeepPayloadAlive(key, variantOrOptions = undefined, maybeOptions = undefined)
  {
    const { resolvedKey, options } = normalizeActivityArguments(key, variantOrOptions, maybeOptions);
    const record = this._entries.get(resolvedKey);
    if (!record) return null;
    Uncache(record);
    this._TouchRecord(record, options);
    record.payloadLastUsedFrame = record.lastUsedFrame;
    record.payloadLastUsedTime = record.lastUsedTime;
    return record.resource;
  }

  /**
   * Add one eviction lock and promote the identity from cached to live.
   * Locking an absent identity is a no-op.
   *
   * @param {string} key Canonical resolved key, or normalized source path with `variant`.
   * @param {string} [variant] Optional promised-output variant.
   * @returns {number} New lock count, or `0` when the identity is absent.
   * @throws {TypeError} If the identity cannot be normalized.
   */
  Lock(key, variant = undefined)
  {
    const record = this._entries.get(normalizeLookupKey(key, variant));
    if (!record) return 0;
    record.lockCount += 1;
    Uncache(record);
    this._TouchRecord(record, {});
    return record.lockCount;
  }

  /**
   * Release one eviction lock without allowing the count to underflow.
   * Unlocking does not itself classify an entry as cached or evict it.
   *
   * @param {string} key Canonical resolved key, or normalized source path with `variant`.
   * @param {string} [variant] Optional promised-output variant.
   * @returns {number} Remaining lock count, or `0` when absent or already unlocked.
   * @throws {TypeError} If the identity cannot be normalized.
   */
  Unlock(key, variant = undefined)
  {
    const record = this._entries.get(normalizeLookupKey(key, variant));
    if (!record) return 0;
    if (record.lockCount > 0) record.lockCount -= 1;
    return record.lockCount;
  }

  /**
   * Run one explicit deterministic inactivity sweep.
   *
   * Identity limits remove unlocked canonical entries, destroy their adapter
   * allocations, release payloads, detach resource-facing lifecycle callbacks,
   * and mark CjsResource-compatible handles purged. Payload limits release only
   * the CPU payload while retaining identity and adapters. Textures retain their
   * bitmap until full purge because rebinding needs it. Geometry retains its
   * meshes for the same reason: Carbon has no prepared-but-empty geometry tier
   * (TriGeometryRes.cpp:496-509). Custom: the two-tier
   * inactivity policy replaces Carbon's reference-counted ownership. The sweep never
   * fetches, reloads, prepares, or infers external JavaScript ownership.
   *
   * An expired identity is Carbon's object losing its last reference: when its
   * class maps `ICacheable` and the cache allows it, it enters the cache instead
   * of being purged (`WeakRefNotify`, MotherLode.cpp:329-401). Cached entries are
   * no longer in use, so the sweep leaves them to `TrimCache`.
   *
   * Cleanup is transactional per identity: a failed cleanup leaves that record
   * canonical and reports a contextual error after all candidates are visited.
   * Successful candidates are still purged when another candidate fails.
   *
   * @param {CjsMotherLodePurgeOptions} [options={}] Explicit sweep point, inactivity limits, and cleanup policy.
   * @returns {CjsMotherLodePurgeResult} Counts and affected canonical keys.
   * @throws {TypeError} If the sweep point, limits, or cleanup policy are invalid.
   * @throws {AggregateError} If one or more cleanup, payload-release, or purge-state operations fail.
   */
  PurgeInactive(options = {})
  {
    this._SettleRenewals();
    const policy = normalizePurgeOptions(options, this._activityFrame, this._now);
    this._activityFrame = Math.max(this._activityFrame, policy.frame);

    const purgedKeys = [];
    const payloadKeys = [];
    const cachedKeys = [];
    const errors = [];
    let locked = 0;

    for (const [ key, record ] of [ ...this._entries ])
    {
      if (record.lockCount > 0)
      {
        locked += 1;
        continue;
      }
      if (record.cached) continue;

      if (isInactive(
        record.lastUsedFrame,
        record.lastUsedTime,
        policy.frame,
        policy.time,
        policy.maxIdleFrames,
        policy.maxIdleMilliseconds
      ))
      {
        let admitted;
        try
        {
          admitted = this._WeakRefNotify(record);
        }
        catch (cause)
        {
          errors.push(motherLodeCleanupError("cache", key, record.resource, cause));
          continue;
        }
        if (admitted)
        {
          cachedKeys.push(key);
          continue;
        }

        try
        {
          this._CleanupRecord(record, policy, "purge inactive", true);
        }
        catch (error)
        {
          errors.push(error);
          continue;
        }

        this._entries.delete(key);
        purgedKeys.push(key);
        try
        {
          record.resource?.MarkPurged?.();
        }
        catch (cause)
        {
          errors.push(motherLodeCleanupError("mark purged", key, record.resource, cause));
        }
        continue;
      }

      if (policy.releasePayload !== false
        && record.resource.constructor?.payload !== ResourceRequirement.TEXTURE
        && record.resource.constructor?.payload !== ResourceRequirement.GEOMETRY
        && hasOwnedPayload(record.resource)
        && isInactive(
          record.payloadLastUsedFrame,
          record.payloadLastUsedTime,
          policy.frame,
          policy.time,
          policy.payloadMaxIdleFrames,
          policy.payloadMaxIdleMilliseconds
        ))
      {
        try
        {
          record.resource.ReleasePayload();
          payloadKeys.push(key);
        }
        catch (cause)
        {
          errors.push(motherLodeCleanupError("release inactive payload", key, record.resource, cause));
        }
      }
    }

    const result = createPurgeResult(policy.frame, policy.time, purgedKeys, payloadKeys, cachedKeys, locked);
    if (errors.length)
    {
      const error = new AggregateError(errors, "CjsMotherLode inactivity purge failed.");
      error.code = "CJS_MOTHERLODE_PURGE_FAILED";
      error.result = result;
      throw error;
    }
    return result;
  }

  /**
   * One cache housekeeping pass (`MotherLode::Housekeeping`, MotherLode.cpp:203-296).
   *
   * First every cached entry renewed since it was cached goes back to live.
   * Then each entry whose size was pending is asked again: once known, it joins
   * the end of the LRU, or is dropped when the size is zero or larger than the
   * whole budget (:208-249). Last, the oldest cached entries are dropped while
   * the total is over budget (:251-291).
   *
   * Cleanup is transactional per candidate. A failure leaves that candidate
   * canonical, later candidates are still attempted, and the final aggregate
   * error carries the partial result. A dropped entry has its adapters
   * destroyed, its payload released and its lifecycle callbacks detached, and
   * is marked `PURGED` by default; nothing is fetched or rebuilt. Explicit
   * cleanup overrides retain their documented ownership.
   *
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for dropped identities.
   * @returns {CjsMotherLodeCacheTrimResult} Byte totals and affected canonical keys.
   * @throws {TypeError} If cleanup options are invalid.
   * @throws {AggregateError} If sizing, cleanup or purge-state publication fails for one or more candidates.
   */
  TrimCache(options = {})
  {
    const policy = normalizeOptions(options, "cache trim");
    const evictedKeys = [];
    const failedKeys = [];
    const errors = [];
    const unwanted = [];

    this._SettleRenewals();

    for (const record of this._entries.values())
    {
      if (!record.cached || !record.pending) continue;

      let size;
      try
      {
        const cacheable = QueryCacheable(record.resource);
        if (!cacheable.IsMemoryUsageKnown()) continue;
        size = this._AcceptedSize(cacheable.GetMemoryUsage());
      }
      catch (cause)
      {
        errors.push(motherLodeCleanupError("size cached entry", record.key, record.resource, cause));
        failedKeys.push(record.key);
        continue;
      }

      if (size)
      {
        // Value::Link: to the end of the LRU.
        record.bytes = size;
        record.pending = false;
        record.cacheSequence = this._nextCacheSequence++;
      }
      else unwanted.push(record);
    }

    const beforeBytes = this._GetCacheBytes();
    let evictedBytes = 0;

    for (const record of unwanted)
    {
      this._EvictCached(record, policy, evictedKeys, failedKeys, errors);
    }

    if (beforeBytes > this._cacheSize)
    {
      const oldestFirst = [ ...this._entries.values() ]
        .filter(record => record.cached && !record.pending)
        .sort((a, b) => a.cacheSequence - b.cacheSequence);

      let bytes = beforeBytes;
      for (const record of oldestFirst)
      {
        if (bytes <= this._cacheSize) break;
        if (!this._EvictCached(record, policy, evictedKeys, failedKeys, errors)) continue;
        bytes -= record.bytes;
        evictedBytes += record.bytes;
      }
    }

    const afterBytes = this._GetCacheBytes();
    const result = createCacheTrimResult(
      this._cacheSize,
      beforeBytes,
      afterBytes,
      evictedBytes,
      evictedKeys,
      failedKeys
    );
    if (errors.length)
    {
      const error = new AggregateError(errors, "CjsMotherLode cache trim failed.");
      error.code = "CJS_MOTHERLODE_CACHE_TRIM_FAILED";
      error.result = result;
      throw error;
    }
    return result;
  }

  /**
   * `MotherLode::WeakRefNotify` (MotherLode.cpp:329-401): an entry nothing uses
   * any more enters the cache when it may be cached, the cache has a budget and
   * its class maps `ICacheable`. A known size is counted now; an unknown one
   * leaves the entry pending until `TrimCache` can ask again.
   *
   * @param {object} record Internal ownership record that just expired.
   * @returns {boolean} Whether the entry was cached; false means drop it.
   * @throws {TypeError} If the resource reports an invalid size.
   */
  _WeakRefNotify(record)
  {
    if (!record.cacheable || !this._cacheSize) return false;
    const cacheable = QueryCacheable(record.resource);
    if (!cacheable) return false;

    if (cacheable.IsMemoryUsageKnown())
    {
      const size = this._AcceptedSize(cacheable.GetMemoryUsage());
      if (!size) return false;
      record.bytes = size;
      record.pending = false;
    }
    else
    {
      record.bytes = 0;
      record.pending = true;
    }

    // Value::Link: to the end of the LRU, or of the pending list.
    record.cached = true;
    record.cacheSequence = this._nextCacheSequence++;
    return true;
  }

  /**
   * A reported size as the cache counts it: zero, meaning "do not cache", when
   * the one object is larger than the whole budget (MotherLode.cpp:229-238,
   * :371-380). Carbon also refuses a size that would overflow its running
   * total; a JavaScript number cannot overflow at any size a budget allows.
   *
   * @param {number} size `ICacheable.GetMemoryUsage`.
   * @returns {number} The size to count, or 0.
   * @throws {TypeError} If the size is not a non-negative safe integer.
   */
  _AcceptedSize(size)
  {
    assertNonNegativeInteger(size, "ICacheable.GetMemoryUsage");
    return size > this._cacheSize ? 0 : size;
  }

  /**
   * Drops one cached entry: `CCP_DELETE value` in Housekeeping.
   *
   * @param {object} record Cached record.
   * @param {CjsMotherLodeMutationOptions} policy Cleanup policy.
   * @param {string[]} evictedKeys Receives the key on success.
   * @param {string[]} failedKeys Receives the key on failure.
   * @param {Error[]} errors Receives any failure.
   * @returns {boolean} Whether the entry was removed.
   */
  _EvictCached(record, policy, evictedKeys, failedKeys, errors)
  {
    try
    {
      this._CleanupRecord(record, policy, "trim cache", true);
    }
    catch (error)
    {
      errors.push(error);
      failedKeys.push(record.key);
      return false;
    }

    if (this._entries.get(record.key) === record) this._entries.delete(record.key);
    evictedKeys.push(record.key);

    try
    {
      record.resource?.MarkPurged?.();
    }
    catch (cause)
    {
      errors.push(motherLodeCleanupError("mark cache eviction purged", record.key, record.resource, cause));
      failedKeys.push(record.key);
    }
    return true;
  }

  /**
   * Configure the cache's byte budget and run housekeeping at once
   * (MotherLode.cpp:179-183). Zero turns caching off: nothing new is cached and
   * everything cached is dropped. The new budget remains installed if partial
   * cleanup fails.
   *
   * @param {number} bytes Non-negative safe-integer byte budget.
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for entries displaced by the smaller budget.
   * @returns {CjsMotherLode} This registry.
   * @throws {TypeError} If `bytes` or cleanup options are invalid.
   * @throws {AggregateError} If enforcing the new budget cannot clean one or more cached entries.
   */
  SetCacheSize(bytes, options = {})
  {
    assertNonNegativeInteger(bytes, "CjsMotherLode cache size");
    const policy = normalizeOptions(options, "set cache size");
    this._cacheSize = bytes;
    this.TrimCache(policy);
    return this;
  }

  /**
   * Return the configured cache byte budget.
   *
   * @returns {number} Non-negative safe-integer byte budget.
   */
  GetCacheSize()
  {
    return this._cacheSize;
  }

  /**
   * Return an immutable snapshot of canonical identity keys.
   *
   * @returns {readonly string[]} Canonical keys in insertion order.
   */
  GetKeys()
  {
    return [ ...this._entries.keys() ];
  }

  /**
   * Return an immutable snapshot of canonical resources.
   *
   * @returns {readonly (object|Function)[]} Resources in insertion order.
   */
  GetValues()
  {
    return [ ...this._entries.values() ].map(record => record.resource);
  }

  /**
   * Return the number of canonical identities currently registered.
   *
   * @returns {number} Registry entry count.
   */
  GetSize()
  {
    return this._entries.size;
  }

  /**
   * Return an immutable diagnostic snapshot without renewing activity.
   * Byte totals include only caller-supplied estimates and do not measure
   * JavaScript reachability or trigger cache policy.
   *
   * @returns {CjsMotherLodeStats} Current identity, activity, state, and byte totals.
   */
  GetStats()
  {
    let bytes = 0;
    let cacheBytes = 0;
    let cached = 0;
    let locked = 0;
    let payloads = 0;
    const paths = new Set();
    const states = {};

    for (const record of this._entries.values())
    {
      bytes += record.bytes;
      if (record.cached)
      {
        cached += 1;
        cacheBytes += record.bytes;
      }
      if (record.lockCount > 0) locked += 1;
      if (hasOwnedPayload(record.resource)) payloads += 1;

      const path = record.resource?.GetPath?.() || record.resource?.path || getKeyPath(record.key);
      if (path) paths.add(path);

      const state = typeof record.resource?.state === "string" ? record.resource.state : "unknown";
      states[state] = (states[state] || 0) + 1;
    }

    return {
      count: this._entries.size,
      size: this._entries.size,
      live: this._entries.size - cached,
      cached,
      locked,
      payloads,
      bytes,
      cacheBytes,
      cacheSize: this._cacheSize,
      activityFrame: this._activityFrame,
      states: states,
      paths: [ ...paths ]
    };
  }

  /**
   * Return a snapshot iterator of canonical key/resource pairs.
   * Later registry mutations do not change the captured key list.
   *
   * @returns {IterableIterator<[string, object|Function]>} Insertion-ordered entry iterator.
   */
  Entries()
  {
    return this.GetKeys().map(key => [ key, this._entries.get(key).resource ])[Symbol.iterator]();
  }

  /**
   * Test a path and optional variant through the temporary legacy API.
   *
   * @deprecated Use `HasKey(getMotherLodeKey(path, variant))`.
   * @param {string} path Source resource path.
   * @param {string} [variant] Optional promised-output variant.
   * @returns {boolean} Whether the resolved identity is registered.
   */
  Has(path, variant = undefined)
  {
    return this.HasKey(path, variant);
  }

  /**
   * Return the registry count through the temporary legacy API.
   *
   * @deprecated Use `GetSize()`.
   * @returns {number} Registry entry count.
   */
  GetCount()
  {
    return this.GetSize();
  }

  /**
   * Remove all variants through the temporary legacy API.
   *
   * @deprecated Use `DeleteAllVariants(path, options)`.
   * @param {string} path Source resource path.
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for removed resources.
   * @returns {boolean} Whether at least one variant was removed.
   */
  DeleteAll(path, options = {})
  {
    return this.DeleteAllVariants(path, options);
  }

  /**
   * Create and validate an internal ownership record before it is registered.
   *
   * @param {string} key Canonical resolved identity key.
   * @param {object|Function} resource Caller-supplied resource owner.
   * @param {CjsMotherLodeInsertOptions} options Validated insertion options.
   * @returns {object} Mutable internal ownership record.
   */
  _CreateRecord(key, resource, options)
  {
    const record = {
      key,
      resource,
      bytes: 0,
      cacheable: true,
      cached: false,
      pending: false,
      cacheSequence: 0,
      lockCount: 0,
      lastUsedFrame: 0,
      lastUsedTime: 0,
      payloadLastUsedFrame: 0,
      payloadLastUsedTime: 0
    };
    this._UpdateRecord(record, options);
    this._TouchRecord(record, options);
    record.payloadLastUsedFrame = record.lastUsedFrame;
    record.payloadLastUsedTime = record.lastUsedTime;
    return record;
  }

  /**
   * Apply `cacheable` (Carbon's `allowCaching`); an entry that may no longer be
   * cached, or is locked, leaves the cache.
   *
   * @param {object} record Mutable internal ownership record.
   * @param {CjsMotherLodeInsertOptions} options Metadata updates.
   * @returns {object} The updated record.
   */
  _UpdateRecord(record, options)
  {
    if (options.cacheable !== undefined) record.cacheable = Boolean(options.cacheable);
    if (!record.cacheable || record.lockCount > 0) Uncache(record);
    return record;
  }

  /**
   * The cache's memory use (Carbon's running `mMemUsage`): the sizes of the
   * cached entries, pending ones counting nothing.
   *
   * @returns {number} Bytes.
   */
  _GetCacheBytes()
  {
    let bytes = 0;
    for (const record of this._entries.values())
    {
      if (record.cached) bytes += record.bytes;
    }
    return bytes;
  }

  /**
   * Record one explicit activity observation for an internal entry.
   *
   * @param {object} record Mutable internal ownership record.
   * @param {CjsMotherLodeActivityOptions} options Optional frame/time override.
   * @returns {object} The updated record.
   * @throws {TypeError} If frame or time is invalid.
   */
  _TouchRecord(record, options)
  {
    const frame = options.frame === undefined ? this._activityFrame + 1 : options.frame;
    assertNonNegativeInteger(frame, "CjsMotherLode activity frame");
    this._activityFrame = Math.max(this._activityFrame, frame);
    record.lastUsedFrame = frame;

    const time = options.time === undefined ? this._now() : options.time;
    if (typeof time !== "number" || !Number.isFinite(time) || time < 0)
    {
      throw new TypeError("CjsMotherLode activity time must be a non-negative finite number.");
    }
    record.lastUsedTime = time;
    return record;
  }

  /**
   * Clean one displaced record and attach canonical ownership context to errors.
   *
   * @param {object} record Internal ownership record being removed.
   * @param {CjsMotherLodeMutationOptions} options Cleanup policy.
   * @param {string} operation Human-readable ownership operation.
   * @param {boolean} [preserveOnFailure=false] Keep lifecycle binding when the record remains canonical.
   * @returns {void}
   * @throws {Error} Contextual `CJS_MOTHERLODE_CLEANUP_FAILED` error on failure.
   */
  _CleanupRecord(record, options, operation, preserveOnFailure = false)
  {
    let cleanupComplete = false;
    try
    {
      cleanupOwnedResource(record.resource, options);
      cleanupComplete = true;
      detachResourceLifecycle(record.resource);
    }
    catch (cause)
    {
      if (!preserveOnFailure && !cleanupComplete)
      {
        try
        {
          detachResourceLifecycle(record.resource);
        }
        catch (detachCause)
        {
          cause = new AggregateError([ cause, detachCause ], "Resource cleanup and detach failed.");
        }
      }
      throw motherLodeCleanupError(operation, record.key, record.resource, cause);
    }
  }

  /**
   * Clean every removed record and aggregate failures without skipping entries.
   *
   * @param {object[]} records Internal ownership records already removed from the registry.
   * @param {CjsMotherLodeMutationOptions} options Shared cleanup policy.
   * @param {string} operation Human-readable ownership operation.
   * @returns {void}
   * @throws {AggregateError} Contextual errors for every failed cleanup.
   */
  _CleanupRecords(records, options, operation)
  {
    const errors = [];
    for (const record of records)
    {
      try
      {
        cleanupOwnedResource(record.resource, options);
      }
      catch (cause)
      {
        errors.push(motherLodeCleanupError(operation, record.key, record.resource, cause));
      }
      try
      {
        detachResourceLifecycle(record.resource);
      }
      catch (cause)
      {
        errors.push(motherLodeCleanupError(`${operation} detach`, record.key, record.resource, cause));
      }
    }
    if (errors.length)
    {
      throw new AggregateError(errors, `CjsMotherLode ${operation} cleanup failed.`);
    }
  }

}

/**
 * Build the canonical normalized identity shared by CjsBlueResMan and MotherLode.
 * The source path and promised-output variant are separated with an internal null byte;
 * variants therefore may not contain that delimiter.
 *
 * @param {string} path Source resource path normalized with Carbon path rules.
 * @param {*} [variant=""] Stable build/outcome variant; empty values use the path alone.
 * @returns {string} Canonical resolved MotherLode identity.
 * @throws {TypeError} If the path is empty/invalid or the variant contains a null byte.
 */
export function getMotherLodeKey(path, variant = "")
{
  const normalizedPath = normalizePath(path);
  if (variant === null || variant === undefined || variant === "") return normalizedPath;

  const normalizedVariant = String(variant);
  if (normalizedVariant.includes("\u0000"))
  {
    throw new TypeError("CjsMotherLode variant may not contain a null character.");
  }
  return `${normalizedPath}\u0000${normalizedVariant}`;
}

function normalizeInsertArguments(keyOrResource, resourceOrPath, optionsOrVariant)
{
  if (typeof keyOrResource === "string")
  {
    return {
      key: normalizeResolvedKey(keyOrResource),
      resource: resourceOrPath,
      options: normalizeOptions(optionsOrVariant, "insert")
    };
  }

  const resource = keyOrResource;
  const path = resourceOrPath ?? resource?.GetPath?.() ?? resource?.path;
  const isOptions = optionsOrVariant && typeof optionsOrVariant === "object" && !Array.isArray(optionsOrVariant);
  const options = isOptions ? normalizeOptions(optionsOrVariant, "insert") : {};
  const variant = isOptions ? options.variant || "" : optionsOrVariant;
  return { key: getMotherLodeKey(path, variant), resource, options };
}

function normalizeDeleteArguments(key, variantOrOptions, maybeOptions)
{
  if (variantOrOptions && typeof variantOrOptions === "object" && !Array.isArray(variantOrOptions))
  {
    return {
      resolvedKey: normalizeResolvedKey(key),
      options: normalizeOptions(variantOrOptions, "delete")
    };
  }
  return {
    resolvedKey: normalizeLookupKey(key, variantOrOptions),
    options: normalizeOptions(maybeOptions || {}, "delete")
  };
}

function normalizeActivityArguments(key, variantOrOptions, maybeOptions)
{
  if (variantOrOptions && typeof variantOrOptions === "object" && !Array.isArray(variantOrOptions))
  {
    return {
      resolvedKey: normalizeResolvedKey(key),
      options: normalizeOptions(variantOrOptions, "activity")
    };
  }
  return {
    resolvedKey: normalizeLookupKey(key, variantOrOptions),
    options: normalizeOptions(maybeOptions || {}, "activity")
  };
}

function normalizeLookupKey(key, variant)
{
  return variant === undefined ? normalizeResolvedKey(key) : getMotherLodeKey(key, variant);
}

function normalizeResolvedKey(key)
{
  if (typeof key !== "string" || !key)
  {
    throw new TypeError("CjsMotherLode requires a canonical string key.");
  }
  const separator = key.indexOf("\u0000");
  return separator === -1
    ? getMotherLodeKey(key)
    : getMotherLodeKey(key.slice(0, separator), key.slice(separator + 1));
}

function normalizePath(path)
{
  const normalizedPath = normalizeResourcePath(path);
  if (!normalizedPath) throw new TypeError("CjsMotherLode requires a resource path.");
  return normalizedPath;
}

/**
 * `Value::Uncache` (MotherLode.h:139): the entry is back in use, and its size
 * no longer counts against the cache.
 *
 * @param {object} record Internal ownership record.
 * @returns {void}
 */
function Uncache(record)
{
  record.cached = false;
  record.pending = false;
  record.bytes = 0;
  record.cacheSequence = 0;
}

/**
 * Carbon's `QueryInterface(GetICacheableIID(), ..., BEQI_SILENT)`
 * (MotherLode.cpp:340): the resource when its class maps `ICacheable`.
 *
 * @param {object|Function} resource Registered resource.
 * @returns {ICacheable|null} The resource, or null.
 */
function QueryCacheable(resource)
{
  return IRoot.prototype.QueryInterface.call(resource, ICacheable, BEQI_SILENT);
}

/** Shared empty activity options for the canonical fast path; never mutated. */
const EMPTY_ACTIVITY = {};

function normalizeOptions(options, operation)
{
  if (options === null || options === undefined) return {};
  if (!options || typeof options !== "object" || Array.isArray(options))
  {
    throw new TypeError(`CjsMotherLode ${operation} options must be an object.`);
  }
  return options;
}

/**
 * Normalize one explicit inactivity sweep without mutating registry entries.
 *
 * @param {CjsMotherLodePurgeOptions} options Caller policy.
 * @param {number} activityFrame Current registry frame.
 * @param {() => number} now Registry clock.
 * @returns {CjsMotherLodePurgeOptions & {frame: number, time: number}} Validated sweep policy.
 */
function normalizePurgeOptions(options, activityFrame, now)
{
  const policy = normalizeOptions(options, "purge");
  const frame = policy.frame === undefined ? activityFrame + 1 : policy.frame;
  assertNonNegativeInteger(frame, "CjsMotherLode purge frame");

  const time = policy.time === undefined ? now() : policy.time;
  assertNonNegativeNumber(time, "CjsMotherLode purge time");

  for (const name of [ "maxIdleFrames", "payloadMaxIdleFrames" ])
  {
    if (policy[name] !== undefined)
    {
      assertNonNegativeInteger(policy[name], `CjsMotherLode ${name}`);
    }
  }
  for (const name of [ "maxIdleMilliseconds", "payloadMaxIdleMilliseconds" ])
  {
    if (policy[name] !== undefined)
    {
      assertNonNegativeNumber(policy[name], `CjsMotherLode ${name}`);
    }
  }

  return { ...policy, frame, time };
}

/**
 * Test whether either configured frame/time limit has elapsed.
 *
 * @param {number} lastFrame Last explicit lease frame.
 * @param {number} lastTime Last explicit lease timestamp.
 * @param {number} frame Current sweep frame.
 * @param {number} time Current sweep timestamp.
 * @param {number|undefined} maxFrames Optional frame limit.
 * @param {number|undefined} maxMilliseconds Optional millisecond limit.
 * @returns {boolean} Whether at least one configured limit has elapsed.
 */
function isInactive(lastFrame, lastTime, frame, time, maxFrames, maxMilliseconds)
{
  const frameExpired = maxFrames !== undefined
    && frame >= lastFrame
    && frame - lastFrame >= maxFrames;
  const timeExpired = maxMilliseconds !== undefined
    && time >= lastTime
    && time - lastTime >= maxMilliseconds;
  return frameExpired || timeExpired;
}

/**
 * Return whether a resource currently exposes a releasable CPU payload.
 *
 * @param {object|Function} resource Candidate resource.
 * @returns {boolean} Whether `ReleasePayload()` can remove an attached payload.
 */
function hasOwnedPayload(resource)
{
  return typeof resource?.HasPayload === "function"
    && typeof resource?.ReleasePayload === "function"
    && Boolean(resource.HasPayload());
}

/**
 * Detach resource-facing lifecycle callbacks after canonical ownership ends.
 *
 * @param {object|Function} resource Removed resource.
 * @returns {void}
 */
function detachResourceLifecycle(resource)
{
  resource?.SetLifecycleController?.(null);
}

function cleanupOwnedResource(resource, options)
{
  if (options.cleanup === false) return;
  if (typeof options.cleanup === "function")
  {
    options.cleanup(resource);
    return;
  }

  const errors = [];
  if (options.destroyAdapters !== false && typeof resource?.DestroyAdapterResources === "function")
  {
    try
    {
      resource.DestroyAdapterResources({ destroy: true });
    }
    catch (error)
    {
      errors.push(error);
    }
  }
  if (options.releasePayload !== false && typeof resource?.ReleasePayload === "function")
  {
    try
    {
      resource.ReleasePayload();
    }
    catch (error)
    {
      errors.push(error);
    }
  }
  if (errors.length)
  {
    throw errors.length === 1 ? errors[0] : new AggregateError(errors, "Resource cleanup failed.");
  }
}

function assertResource(resource)
{
  if ((typeof resource !== "object" && typeof resource !== "function") || resource === null)
  {
    throw new TypeError("CjsMotherLode requires a resource object.");
  }
}

/**
 * Create one Insert result.
 *
 * @param {string} key Canonical resolved identity key.
 * @param {object|Function} resource Canonical owner after the insert.
 * @param {boolean} inserted Whether the supplied resource was published.
 * @param {boolean} replaced Whether a previous owner was displaced.
 * @param {object|Function|null} displaced Former owner when replaced.
 * @returns {CjsMotherLodeInsertResult} Canonical ownership result.
 */
function createInsertResult(key, resource, inserted, replaced, displaced)
{
  return { key, resource, inserted, replaced, displaced };
}

/**
 * Create one exact-owner compare-and-swap result.
 *
 * @param {string} key Canonical resolved identity key.
 * @param {boolean} committed Whether publication replaced the expected owner.
 * @param {object|Function|null} resource Canonical owner after the attempt.
 * @param {object|Function|null} displaced Former owner when committed.
 * @returns {CjsMotherLodeConditionalReplaceResult} Replacement result.
 */
function createConditionalReplaceResult(key, committed, resource, displaced)
{
  return { key, committed, resource, displaced };
}

/**
 * Create one inactivity-sweep result and its affected-key snapshots.
 *
 * @param {number} frame Sweep frame.
 * @param {number} time Sweep timestamp.
 * @param {string[]} purgedKeys Removed canonical keys.
 * @param {string[]} payloadKeys Keys whose payloads were released.
 * @param {string[]} cachedKeys Keys that entered the cache instead of being purged.
 * @param {number} locked Number of locked entries skipped.
 * @returns {CjsMotherLodePurgeResult} Sweep result.
 */
function createPurgeResult(frame, time, purgedKeys, payloadKeys, cachedKeys, locked)
{
  return {
    frame,
    time,
    purged: purgedKeys.length,
    payloadsReleased: payloadKeys.length,
    cached: cachedKeys.length,
    locked,
    purgedKeys: purgedKeys,
    payloadKeys: payloadKeys,
    cachedKeys: cachedKeys
  };
}

/**
 * Create one byte-budget housekeeping result and its affected-key snapshots.
 *
 * @param {number} cacheSize Configured cache budget.
 * @param {number} beforeBytes Cached bytes before housekeeping.
 * @param {number} afterBytes Cached bytes after housekeeping.
 * @param {number} evictedBytes Successfully removed cached bytes.
 * @param {string[]} evictedKeys Successfully removed canonical identities.
 * @param {string[]} failedKeys Candidate identities that reported failure.
 * @returns {CjsMotherLodeCacheTrimResult} Cache-housekeeping result.
 */
function createCacheTrimResult(
  cacheSize,
  beforeBytes,
  afterBytes,
  evictedBytes,
  evictedKeys,
  failedKeys
)
{
  return {
    cacheSize,
    beforeBytes,
    afterBytes,
    evictedBytes,
    overBudget: afterBytes > cacheSize,
    evicted: evictedKeys.length,
    failed: failedKeys.length,
    evictedKeys: evictedKeys,
    failedKeys: failedKeys
  };
}

function motherLodeInactiveError()
{
  const error = new Error("CjsMotherLode is shut down. Call Startup() before inserting resources.");
  error.code = "CJS_MOTHERLODE_INACTIVE";
  return error;
}

function motherLodeCleanupError(operation, key, resource, cause)
{
  const error = new Error(`CjsMotherLode ${operation} cleanup failed for ${key}.`, { cause });
  error.code = "CJS_MOTHERLODE_CLEANUP_FAILED";
  error.operation = operation;
  error.key = key;
  error.resource = resource;
  return error;
}

function getKeyPath(key)
{
  const separator = key.indexOf("\u0000");
  return separator === -1 ? key : key.slice(0, separator);
}

/** Purge timers are ours (MotherLode.cpp has none); they read blue's host milliseconds. */
function defaultNow()
{
  return CjsBlueOS.Monotonic();
}


CjsSchema.blue.define(CjsMotherLode, {
  className: "CjsMotherLode",
  donors: [ "MotherLode" ],
  fields: {},
  methods: {
    Startup: [ blue.method, meta.adapted ],
    Shutdown: [ blue.method, meta.adapted ],
    Insert: [ blue.method, meta.adapted ],
    HasKey: [ blue.method, meta.adapted ],
    Lookup: [ blue.method, meta.adapted ],
    Delete: [ blue.method, meta.adapted ],
    Clear: [ blue.method, meta.adapted ],
    ClearCached: [ blue.method, meta.adapted ],
    SetCacheSize: [ blue.method, meta.adapted ],
    GetCacheSize: [ blue.method, meta.adapted ],
    GetStats: [ blue.method, meta.adapted ],
    GetKeys: [ blue.method, meta.adapted ],
    GetValues: [ blue.method, meta.adapted ],
    GetSize: [ blue.method, meta.adapted ],
    TrimCache: [ blue.method, meta.renamed("Housekeeping"), meta.adapted ],
    _WeakRefNotify: [ blue.method, meta.renamed("WeakRefNotify"), meta.adapted ]
  }
});
