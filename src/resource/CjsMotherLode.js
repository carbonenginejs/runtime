// Source: blue/include/IMotherLode.h
// Source: blue/src/MotherLode.h
// Source: blue/src/MotherLode.cpp
import { normalizeResourcePath } from "#utils/path";

const DEFAULT_CACHE_SIZE = 32 * 1024 * 1024;
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Construction options for {@link CjsMotherLode}.
 *
 * @typedef {object} CjsMotherLodeOptions
 * @property {() => number} [now] Returns a non-negative timestamp for activity diagnostics.
 * @property {number} [cacheSize] Initial recorded-byte budget for explicitly cached entries.
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
 * @property {number} [bytes=0] Caller-supplied non-negative safe-integer eviction weight.
 * @property {boolean} [cacheable=true] Whether policy may explicitly admit the entry to the byte cache.
 * @property {boolean} [cached=false] Admit the entry to oldest-first trimming and `ClearCached()`.
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
 * Immutable result from one explicit inactivity sweep.
 *
 * @typedef {object} CjsMotherLodePurgeResult
 * @property {number} frame Sweep activity frame.
 * @property {number} time Sweep timestamp in milliseconds.
 * @property {number} purged Number of canonical identities removed and cleaned.
 * @property {number} payloadsReleased Number of payloads released while retaining their identities.
 * @property {number} locked Number of locked identities skipped by the sweep.
 * @property {readonly string[]} purgedKeys Canonical identities removed by the sweep.
 * @property {readonly string[]} payloadKeys Canonical identities whose payload lease expired.
 */

/**
 * Immutable result from deterministic recorded-byte cache housekeeping.
 *
 * Only explicitly cached, cacheable, unlocked records contribute to the
 * budget. Zero-byte records do not create pressure and are retained because
 * removing them cannot reduce the recorded byte total.
 *
 * @typedef {object} CjsMotherLodeCacheTrimResult
 * @property {number} cacheSize Configured recorded-byte budget.
 * @property {number} beforeBytes Explicit cached bytes before housekeeping.
 * @property {number} afterBytes Explicit cached bytes after housekeeping.
 * @property {number} evictedBytes Recorded bytes removed successfully.
 * @property {boolean} overBudget Whether retained cached records still exceed the budget.
 * @property {number} evicted Number of complete canonical identities removed.
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
 * Immutable result returned by {@link CjsMotherLode#Insert}.
 *
 * @typedef {object} CjsMotherLodeInsertResult
 * @property {string} key Canonical resolved identity key.
 * @property {object|Function} resource Resource that owns the canonical identity after the call.
 * @property {boolean} inserted Whether the supplied resource was newly registered.
 * @property {boolean} replaced Whether a different registered resource was displaced.
 * @property {object|Function|null} displaced Previous resource returned after successful cleanup or retention.
 */

/**
 * Immutable result from an exact-owner conditional replacement.
 *
 * @typedef {object} CjsMotherLodeConditionalReplaceResult
 * @property {string} key Canonical resolved identity key.
 * @property {boolean} committed Whether the expected owner was replaced.
 * @property {object|Function|null} resource Canonical resource after the compare-and-swap attempt.
 * @property {object|Function|null} displaced Former exact owner when the replacement committed.
 */

/**
 * Immutable diagnostic snapshot returned by {@link CjsMotherLode#GetStats}.
 *
 * @typedef {object} CjsMotherLodeStats
 * @property {number} count Compatibility identity count.
 * @property {number} size Canonical identity count.
 * @property {number} live Number of entries not explicitly classified as cached.
 * @property {number} cached Number of explicitly cached entries.
 * @property {number} locked Number of entries with at least one eviction lock.
 * @property {number} payloads Number of entries currently retaining a CPU payload.
 * @property {number} bytes Total caller-supplied eviction weight.
 * @property {number} cacheBytes Byte estimate for explicitly cached entries.
 * @property {number} cacheSize Configured recorded-byte cache budget.
 * @property {number} activityFrame Highest activity frame observed by this registry.
 * @property {Readonly<Record<string, number>>} states Resource count grouped by state name.
 * @property {readonly string[]} paths Unique resource paths in encounter order.
 */

/**
 * Strong, deterministic JavaScript resource registry.
 *
 * Carbon can move resources between weak live registration and a strong LRU
 * cache. JavaScript ownership cannot reproduce that transition reliably, so
 * entries remain strongly owned until explicit ownership removal or an
 * explicit inactivity/recorded-byte policy evicts them.
 */
export class CjsMotherLode
{

  #active = false;
  #activityFrame = 0;
  #cacheSize = DEFAULT_CACHE_SIZE;
  #entries = new Map();
  #nextCacheSequence = 1;
  #now = defaultNow;

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
      this.#now = options.now;
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
    this.#active = true;
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
      this.#active = false;
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
    return this.#active;
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
   * @returns {CjsMotherLodeInsertResult} Immutable canonical ownership result.
   * @throws {TypeError} If the key, resource, metadata, or activity values are invalid.
   * @throws {Error} If the registry is inactive or displaced-resource cleanup fails.
   */
  Insert(keyOrResource, resourceOrPath, optionsOrVariant = {})
  {
    if (!this.#active)
    {
      throw motherLodeInactiveError();
    }

    const { key, resource, options } = normalizeInsertArguments(
      keyOrResource,
      resourceOrPath,
      optionsOrVariant
    );
    assertResource(resource);

    const existing = this.#entries.get(key) || null;
    if (existing && existing.resource === resource)
    {
      const updated = { ...existing };
      this.#UpdateRecord(updated, options);
      this.#AssertRecordedBytesTotal(updated, existing);
      this.#TouchRecord(updated, options);
      Object.assign(existing, updated);
      return freezeInsertResult(key, resource, false, false, null);
    }
    if (existing && options.replace === false)
    {
      return freezeInsertResult(key, existing.resource, false, false, null);
    }

    const record = this.#CreateRecord(key, resource, options, existing);

    if (existing)
    {
      this.#CleanupRecord(existing, options, "replace", true);
    }
    this.#entries.set(key, record);

    return freezeInsertResult(key, resource, true, Boolean(existing), existing?.resource || null);
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
   * Recorded bytes and cacheability inherit from the expected record unless
   * explicitly supplied. The replacement is live by default because a
   * successful staged reload is an activity observation.
   *
   * @param {string} key Canonical resolved identity key.
   * @param {object|Function} expected Exact resource that must still own `key`.
   * @param {object|Function} resource Fully prepared replacement resource.
   * @param {CjsMotherLodeConditionalReplaceOptions} [options={}] Replacement metadata, authority guard, and displaced-owner cleanup policy.
   * @returns {CjsMotherLodeConditionalReplaceResult} Immutable compare-and-swap outcome.
   * @throws {TypeError} If the key, resources, metadata, or activity values are invalid.
   * @throws {Error} If the registry is inactive or the prepared resource aliases the expected owner.
   * @throws {AggregateError} After a committed swap when displaced-owner cleanup fails.
   */
  ReplaceExpected(key, expected, resource, options = {})
  {
    if (!this.#active)
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

    const existing = this.#entries.get(resolvedKey) || null;
    if (!existing || existing.resource !== expected)
    {
      return freezeConditionalReplaceResult(
        resolvedKey,
        false,
        existing?.resource || null,
        null
      );
    }

    const recordOptions = {
      ...policy,
      bytes: policy.bytes === undefined ? existing.bytes : policy.bytes,
      cacheable: policy.cacheable === undefined ? existing.cacheable : policy.cacheable,
      cached: policy.cached === undefined ? false : policy.cached
    };
    const record = this.#CreateRecord(resolvedKey, resource, recordOptions, existing);

    // Re-check after clock/metadata validation, then publish with no user code
    // between the exact-record comparison and Map mutation.
    if ((policy.commitGuard && !policy.commitGuard())
      || this.#entries.get(resolvedKey) !== existing)
    {
      return freezeConditionalReplaceResult(
        resolvedKey,
        false,
        this.#entries.get(resolvedKey)?.resource || null,
        null
      );
    }
    this.#entries.set(resolvedKey, record);

    const result = freezeConditionalReplaceResult(resolvedKey, true, resource, expected);
    try
    {
      this.#CleanupRecord(existing, policy, "conditional replace");
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
    return this.#entries.has(normalizeLookupKey(key, variant));
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
    return this.#entries.get(normalizeLookupKey(key, variant))?.resource || null;
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
    const record = this.#entries.get(resolvedKey);
    if (!record) return false;

    this.#entries.delete(resolvedKey);
    this.#CleanupRecord(record, options, "delete");
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

    for (const [ key, record ] of this.#entries)
    {
      if (key === normalizedPath || key.startsWith(prefix))
      {
        records.push(record);
        this.#entries.delete(key);
      }
    }

    this.#CleanupRecords(records, options, "delete variants");
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
    const records = [ ...this.#entries.values() ];
    this.#entries.clear();
    this.#CleanupRecords(records, options, "clear");
    return this;
  }

  /**
   * Remove entries explicitly classified as cached and not locked.
   *
   * JavaScript cannot infer external ownership, so only callers that inserted
   * an entry with `{ cached: true }` classify it for this operation.
   *
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for removed cache entries.
   * @returns {number} Number of entries removed before cleanup.
   * @throws {AggregateError} If cleanup fails for one or more removed resources.
   */
  ClearCached(options = {})
  {
    const records = [];
    for (const [ key, record ] of this.#entries)
    {
      if (record.cached && record.lockCount === 0)
      {
        records.push(record);
        this.#entries.delete(key);
      }
    }
    this.#CleanupRecords(records, options, "clear cached");
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
    const record = this.#entries.get(resolvedKey);
    if (!record) return null;
    record.cached = false;
    record.cacheSequence = 0;
    this.#TouchRecord(record, options);
    return record.resource;
  }

  /**
   * Explicitly renew both canonical identity activity and the attached CPU
   * payload lease. The resource-facing `KeepPayloadAlive()` method delegates
   * here when CjsResMan owns the handle. No payload is read or created.
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
    const record = this.#entries.get(resolvedKey);
    if (!record) return null;
    record.cached = false;
    record.cacheSequence = 0;
    this.#TouchRecord(record, options);
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
    const record = this.#entries.get(normalizeLookupKey(key, variant));
    if (!record) return 0;
    record.lockCount += 1;
    record.cached = false;
    record.cacheSequence = 0;
    this.#TouchRecord(record, {});
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
    const record = this.#entries.get(normalizeLookupKey(key, variant));
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
   * the CPU payload while retaining identity and adapters. The sweep never
   * fetches, reloads, prepares, or infers external JavaScript ownership.
   *
   * Cleanup is transactional per identity: a failed cleanup leaves that record
   * canonical and reports a contextual error after all candidates are visited.
   * Successful candidates are still purged when another candidate fails.
   *
   * @param {CjsMotherLodePurgeOptions} [options={}] Explicit sweep point, inactivity limits, and cleanup policy.
   * @returns {CjsMotherLodePurgeResult} Immutable counts and affected canonical keys.
   * @throws {TypeError} If the sweep point, limits, or cleanup policy are invalid.
   * @throws {AggregateError} If one or more cleanup, payload-release, or purge-state operations fail.
   */
  PurgeInactive(options = {})
  {
    const policy = normalizePurgeOptions(options, this.#activityFrame, this.#now);
    this.#activityFrame = Math.max(this.#activityFrame, policy.frame);

    const purgedKeys = [];
    const payloadKeys = [];
    const errors = [];
    let locked = 0;

    for (const [ key, record ] of [ ...this.#entries ])
    {
      if (record.lockCount > 0)
      {
        locked += 1;
        continue;
      }

      if (isInactive(
        record.lastUsedFrame,
        record.lastUsedTime,
        policy.frame,
        policy.time,
        policy.maxIdleFrames,
        policy.maxIdleMilliseconds
      ))
      {
        try
        {
          this.#CleanupRecord(record, policy, "purge inactive", true);
        }
        catch (error)
        {
          errors.push(error);
          continue;
        }

        this.#entries.delete(key);
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

    const result = freezePurgeResult(policy.frame, policy.time, purgedKeys, payloadKeys, locked);
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
   * Remove complete explicitly cached identities until their recorded byte
   * total fits the configured budget.
   *
   * Candidates are ordered by explicit cache admission, oldest first. Lookup
   * is intentionally pure; callers re-admit a live identity by inserting the
   * same handle with `{ cached: true }`. Locks and `KeepAlive()` promote an
   * entry to live and therefore remove it from byte-budget consideration.
   *
   * Cleanup is transactional per candidate. A failure leaves that candidate
   * canonical, later candidates are still attempted, and the final aggregate
   * error carries the partial immutable result. Successful pressure eviction
   * destroys adapters, releases payloads, detaches lifecycle callbacks, marks
   * compatible handles `PURGED` by default, and never fetches or reconstructs
   * data. Explicit cleanup overrides retain their documented ownership.
   *
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for pressure-evicted identities.
   * @returns {CjsMotherLodeCacheTrimResult} Immutable byte totals and affected canonical keys.
   * @throws {TypeError} If cleanup options are invalid.
   * @throws {AggregateError} If cleanup or purge-state publication fails for one or more candidates.
   */
  TrimCache(options = {})
  {
    const policy = normalizeOptions(options, "cache trim");
    const beforeBytes = this.#GetCacheBytes();
    const evictedKeys = [];
    const failedKeys = [];
    const errors = [];
    let evictedBytes = 0;

    if (beforeBytes > this.#cacheSize)
    {
      const candidates = [ ...this.#entries.values() ]
        .filter(record => record.cacheable
          && record.cached
          && record.lockCount === 0
          && record.bytes > 0)
        .sort((a, b) => a.cacheSequence - b.cacheSequence);

      for (const record of candidates)
      {
        if (this.#GetCacheBytes() <= this.#cacheSize) break;
        if (this.#entries.get(record.key) !== record
          || !record.cacheable
          || !record.cached
          || record.lockCount > 0
          || record.bytes <= 0)
        {
          continue;
        }

        try
        {
          this.#CleanupRecord(record, policy, "trim cache", true);
        }
        catch (error)
        {
          errors.push(error);
          failedKeys.push(record.key);
          continue;
        }

        if (this.#entries.get(record.key) === record)
        {
          this.#entries.delete(record.key);
        }
        evictedKeys.push(record.key);
        evictedBytes += record.bytes;

        try
        {
          record.resource?.MarkPurged?.();
        }
        catch (cause)
        {
          errors.push(motherLodeCleanupError("mark cache eviction purged", record.key, record.resource, cause));
          failedKeys.push(record.key);
        }
      }
    }

    const afterBytes = this.#GetCacheBytes();
    const result = freezeCacheTrimResult(
      this.#cacheSize,
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
   * Configure and immediately enforce the recorded-byte budget for explicit
   * cached entries. The new budget remains installed if partial cleanup fails,
   * matching Carbon's policy-first `SetCacheSize` behavior.
   *
   * @param {number} bytes Non-negative safe-integer byte budget.
   * @param {CjsMotherLodeMutationOptions} [options={}] Cleanup policy for entries displaced by the smaller budget.
   * @returns {CjsMotherLode} This registry.
   * @throws {TypeError} If `bytes` or cleanup options are invalid.
   * @throws {AggregateError} If enforcing the new budget cannot clean one or more cached entries.
   */
  SetCacheSize(bytes, options = {})
  {
    assertNonNegativeSafeInteger(bytes, "CjsMotherLode cache size");
    const policy = normalizeOptions(options, "set cache size");
    this.#cacheSize = bytes;
    this.TrimCache(policy);
    return this;
  }

  /**
   * Return the configured recorded-byte cache budget.
   *
   * @returns {number} Non-negative safe-integer byte budget.
   */
  GetCacheSize()
  {
    return this.#cacheSize;
  }

  /**
   * Return an immutable snapshot of canonical identity keys.
   *
   * @returns {readonly string[]} Canonical keys in insertion order.
   */
  GetKeys()
  {
    return Object.freeze([ ...this.#entries.keys() ]);
  }

  /**
   * Return an immutable snapshot of canonical resources.
   *
   * @returns {readonly (object|Function)[]} Resources in insertion order.
   */
  GetValues()
  {
    return Object.freeze([ ...this.#entries.values() ].map(record => record.resource));
  }

  /**
   * Return the number of canonical identities currently registered.
   *
   * @returns {number} Registry entry count.
   */
  GetSize()
  {
    return this.#entries.size;
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

    for (const record of this.#entries.values())
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

    return Object.freeze({
      count: this.#entries.size,
      size: this.#entries.size,
      live: this.#entries.size - cached,
      cached,
      locked,
      payloads,
      bytes,
      cacheBytes,
      cacheSize: this.#cacheSize,
      activityFrame: this.#activityFrame,
      states: Object.freeze(states),
      paths: Object.freeze([ ...paths ])
    });
  }

  /**
   * Return a snapshot iterator of canonical key/resource pairs.
   * Later registry mutations do not change the captured key list.
   *
   * @returns {IterableIterator<[string, object|Function]>} Insertion-ordered entry iterator.
   */
  Entries()
  {
    return this.GetKeys().map(key => [ key, this.#entries.get(key).resource ])[Symbol.iterator]();
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
   * @param {object|null} [displaced=null] Existing record excluded from aggregate byte validation.
   * @returns {object} Mutable internal ownership record.
   */
  #CreateRecord(key, resource, options, displaced = null)
  {
    const record = {
      key,
      resource,
      bytes: 0,
      cacheable: true,
      cached: false,
      cacheSequence: 0,
      lockCount: 0,
      lastUsedFrame: 0,
      lastUsedTime: 0,
      payloadLastUsedFrame: 0,
      payloadLastUsedTime: 0
    };
    this.#UpdateRecord(record, options);
    this.#AssertRecordedBytesTotal(record, displaced);
    this.#TouchRecord(record, options);
    record.payloadLastUsedFrame = record.lastUsedFrame;
    record.payloadLastUsedTime = record.lastUsedTime;
    return record;
  }

  /**
   * Apply explicit size/cache metadata while preserving lock invariants.
   *
   * @param {object} record Mutable internal ownership record.
   * @param {CjsMotherLodeInsertOptions} options Metadata updates.
   * @returns {object} The updated record.
   */
  #UpdateRecord(record, options)
  {
    if (options.bytes !== undefined)
    {
      assertNonNegativeSafeInteger(options.bytes, "CjsMotherLode entry bytes");
      record.bytes = options.bytes;
    }
    if (options.cacheable !== undefined) record.cacheable = Boolean(options.cacheable);
    if (options.cached !== undefined)
    {
      record.cached = record.cacheable && record.lockCount === 0 && Boolean(options.cached);
      record.cacheSequence = record.cached ? this.#nextCacheSequence++ : 0;
    }
    if (!record.cacheable || record.lockCount > 0)
    {
      record.cached = false;
      record.cacheSequence = 0;
    }
    return record;
  }

  /**
   * Reject metadata that would make aggregate recorded-byte arithmetic lose
   * integer precision. This keeps trim results and diagnostics exact without
   * attempting to measure JavaScript object graphs heuristically.
   *
   * @param {object} candidate New or updated record.
   * @param {object|null} [excluded=null] Existing record replaced by the candidate.
   * @returns {void}
   * @throws {RangeError} If aggregate recorded bytes exceed the safe-integer range.
   */
  #AssertRecordedBytesTotal(candidate, excluded = null)
  {
    let total = BigInt(candidate.bytes);
    for (const record of this.#entries.values())
    {
      if (record === excluded) continue;
      total += BigInt(record.bytes);
      if (total > MAX_SAFE_INTEGER_BIGINT)
      {
        throw new RangeError("CjsMotherLode aggregate recorded bytes exceed Number.MAX_SAFE_INTEGER.");
      }
    }
  }

  /**
   * Sum exact byte weights for explicit cached entries.
   * Aggregate safety is maintained at insertion/update time.
   *
   * @returns {number} Exact explicit-cache byte total.
   */
  #GetCacheBytes()
  {
    let bytes = 0;
    for (const record of this.#entries.values())
    {
      if (record.cacheable && record.cached) bytes += record.bytes;
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
  #TouchRecord(record, options)
  {
    const frame = options.frame === undefined ? this.#activityFrame + 1 : options.frame;
    assertNonNegativeSafeInteger(frame, "CjsMotherLode activity frame");
    this.#activityFrame = Math.max(this.#activityFrame, frame);
    record.lastUsedFrame = frame;

    const time = options.time === undefined ? this.#now() : options.time;
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
  #CleanupRecord(record, options, operation, preserveOnFailure = false)
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
  #CleanupRecords(records, options, operation)
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
 * Build the canonical normalized identity shared by CjsResMan and MotherLode.
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
  assertNonNegativeSafeInteger(frame, "CjsMotherLode purge frame");

  const time = policy.time === undefined ? now() : policy.time;
  assertNonNegativeFiniteNumber(time, "CjsMotherLode purge time");

  for (const name of [ "maxIdleFrames", "payloadMaxIdleFrames" ])
  {
    if (policy[name] !== undefined)
    {
      assertNonNegativeSafeInteger(policy[name], `CjsMotherLode ${name}`);
    }
  }
  for (const name of [ "maxIdleMilliseconds", "payloadMaxIdleMilliseconds" ])
  {
    if (policy[name] !== undefined)
    {
      assertNonNegativeFiniteNumber(policy[name], `CjsMotherLode ${name}`);
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

function assertNonNegativeSafeInteger(value, label)
{
  if (!Number.isSafeInteger(value) || value < 0)
  {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
}

/**
 * Validate a non-negative finite number with a contextual error label.
 *
 * @param {*} value Candidate numeric value.
 * @param {string} label Error-message field name.
 * @returns {void}
 */
function assertNonNegativeFiniteNumber(value, label)
{
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  {
    throw new TypeError(`${label} must be a non-negative finite number.`);
  }
}

function freezeInsertResult(key, resource, inserted, replaced, displaced)
{
  return Object.freeze({ key, resource, inserted, replaced, displaced });
}

/**
 * Freeze one exact-owner compare-and-swap result.
 *
 * @param {string} key Canonical resolved identity key.
 * @param {boolean} committed Whether publication replaced the expected owner.
 * @param {object|Function|null} resource Canonical owner after the attempt.
 * @param {object|Function|null} displaced Former owner when committed.
 * @returns {CjsMotherLodeConditionalReplaceResult} Immutable replacement result.
 */
function freezeConditionalReplaceResult(key, committed, resource, displaced)
{
  return Object.freeze({ key, committed, resource, displaced });
}

/**
 * Freeze one inactivity-sweep result and its affected-key snapshots.
 *
 * @param {number} frame Sweep frame.
 * @param {number} time Sweep timestamp.
 * @param {string[]} purgedKeys Removed canonical keys.
 * @param {string[]} payloadKeys Keys whose payloads were released.
 * @param {number} locked Number of locked entries skipped.
 * @returns {CjsMotherLodePurgeResult} Immutable sweep result.
 */
function freezePurgeResult(frame, time, purgedKeys, payloadKeys, locked)
{
  return Object.freeze({
    frame,
    time,
    purged: purgedKeys.length,
    payloadsReleased: payloadKeys.length,
    locked,
    purgedKeys: Object.freeze(purgedKeys),
    payloadKeys: Object.freeze(payloadKeys)
  });
}

/**
 * Freeze one byte-budget housekeeping result and its affected-key snapshots.
 *
 * @param {number} cacheSize Configured cache budget.
 * @param {number} beforeBytes Cached bytes before housekeeping.
 * @param {number} afterBytes Cached bytes after housekeeping.
 * @param {number} evictedBytes Successfully removed cached bytes.
 * @param {string[]} evictedKeys Successfully removed canonical identities.
 * @param {string[]} failedKeys Candidate identities that reported failure.
 * @returns {CjsMotherLodeCacheTrimResult} Immutable cache-housekeeping result.
 */
function freezeCacheTrimResult(
  cacheSize,
  beforeBytes,
  afterBytes,
  evictedBytes,
  evictedKeys,
  failedKeys
)
{
  return Object.freeze({
    cacheSize,
    beforeBytes,
    afterBytes,
    evictedBytes,
    overBudget: afterBytes > cacheSize,
    evicted: evictedKeys.length,
    failed: failedKeys.length,
    evictedKeys: Object.freeze(evictedKeys),
    failedKeys: Object.freeze(failedKeys)
  });
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

function defaultNow()
{
  return Date.now();
}
