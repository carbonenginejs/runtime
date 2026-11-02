// Source: blue/include/BlueAsyncRes.h
// Source: blue/src/BlueAsyncRes.cpp
// Source: blue/src/BlueAsyncRes_Blue.cpp
import { exposure as be } from "#be";
import { CjsSchema, type } from "#schema";
import * as CcpLog from "../../global/logging/ccpLog.js";
import { blue } from "./blue.js";
import { IBlueCallbackMan } from "./IBlueCallbackMan.js";
import { BlueResManQueue } from "./IBlueResMan.js";
import { IBlueResource } from "./IBlueResource.js";

/**
 * A resource loaded on the manager's background queue and prepared on its main
 * queue, notifying registered targets when it finishes.
 *
 * Carbon: BlueAsyncRes (blue/include/BlueAsyncRes.h:30-191)
 *
 * Subclasses provide `_DoLoad` and `_DoPrepare`. JavaScript is single-threaded,
 * so Carbon's `CcpAtomic<uint32_t>` flags are plain booleans, and the
 * hand-grown notify-target block (`m_reloadNotifyTargets` plus its count) is an
 * Array of WeakRefs.
 *
 * @abstract
 */
export class BlueAsyncRes
{
  /** `LoadingResult` - what `_DoLoad` reports (BlueAsyncRes.h:106-109). */
  static LoadingResult = Object.freeze({
    LR_FAILED: 0,
    LR_SUCCESS: 1,
    LR_SUCCESS_DONTNOTIFY: 2
  });

  /** `m_path` - the resource path, query included. */
  _path = "";

  /** `m_ext` - the requested extension. */
  _ext = "";

  /** `m_queryArguments` - the parsed `?name=value&...` pairs, as `[name, value]`. */
  _queryArguments = [];

  /** `m_dataStream` - the open file during `_LoadAsync`: `{ form, data }` from the paths service. */
  _dataStream = null;

  /** `m_reservedMemory` - background-load memory reserved for the open stream. */
  _reservedMemory = 0;

  /** `m_isLoading` - the resource is being loaded or prepared. */
  _isLoading = false;

  /** `m_isPrepared` - loading and preparing finished, successfully or not. */
  _isPrepared = false;

  /** `m_loadSucceeded` - the load phase succeeded. */
  _loadSucceeded = false;

  /** `m_notify` - notify targets when prepare finishes. */
  _notify = true;

  /** `m_isGood` - load and prepare both succeeded. */
  _isGood = false;

  /** `m_loadCbId` - the background-queue request, while load is scheduled. */
  _loadCbId = 0;

  /** `m_prepareCbId` - the main-queue request, while prepare is scheduled. */
  _prepareCbId = 0;

  /** `m_isUrgent` - urgent loads were on when this resource was queued. */
  _isUrgent = false;

  /** `m_isForcedSynchronous` - load starts at `Initialize` instead of on the queue. */
  _isForcedSynchronous = false;

  /**
   * `m_reloadNotifyTargets` (BlueAsyncRes.h:189) - the registered
   * `IBlueAsyncResNotifyTarget`s, each held through a WeakRef.
   *
   * @adapted Carbon's block holds raw, non-owning pointers and each target's
   *   destructor unregisters (Tr2Mesh.cpp:14-23). JavaScript has no
   *   deterministic destructor, so a strong reference here kept every consumer
   *   that was never Destructed alive through its resource. WeakRef keeps the
   *   block non-owning, as Tr2Event does for BlueWeakRefBase; dead entries are
   *   dropped when the block is walked.
   * @type {WeakRef<import("./IBlueAsyncResNotifyTarget.js").IBlueAsyncResNotifyTarget>[]}
   */
  _reloadNotifyTargets = [];

  /**
   * `isGood` (MAP_PROPERTY_READONLY, _Blue.cpp:15-23).
   *
   * @implemented
   */
  get isGood()
  {
    return this.IsGood();
  }

  /**
   * `isPrepared` (MAP_PROPERTY_READONLY, _Blue.cpp:24-29).
   *
   * @implemented
   */
  get isPrepared()
  {
    return this.IsPrepared();
  }

  /**
   * `isLoading` (MAP_PROPERTY_READONLY, _Blue.cpp:30-35).
   *
   * @implemented
   */
  get isLoading()
  {
    return this.IsLoading();
  }

  /**
   * Carbon: BlueAsyncRes::Shutdown (blue/src/BlueAsyncRes.cpp:47-58)
   *
   * Cancels a pending load, then gives the subclass its `_OnShutdown`.
   *
   * @implemented
   */
  Shutdown()
  {
    if (this._isLoading)
    {
      this.CancelPendingLoad();
    }

    this._OnShutdown();
  }

  /**
   * Carbon: BlueAsyncRes::ForceSynchronousLoad (blue/src/BlueAsyncRes.cpp:349-352)
   *
   * @implemented
   */
  ForceSynchronousLoad()
  {
    this._isForcedSynchronous = true;
  }

  /**
   * Cancel this attempt; late asynchronous results cannot mutate the next one.
   *
   * @implemented
   */
  CancelPendingLoad()
  {
    blue.resMan._CancelResourceLoad(this);
    if (this._loadCbId)
    {
      blue.resMan.CancelFromQueue(BlueResManQueue.BRMQ_BACKGROUND, this._loadCbId);
      this._loadCbId = 0;
    }
    if (this._prepareCbId)
    {
      blue.resMan.CancelFromQueue(BlueResManQueue.BRMQ_MAIN, this._prepareCbId);
      this._prepareCbId = 0;
    }
    this._isLoading = false;
    this._CleanupLoadData();
    this._CloseStream();
  }

  /**
   * Carbon: BlueAsyncRes::AddNotifyTarget (blue/src/BlueAsyncRes.cpp:261-290)
   *
   * A target added to a prepared resource is notified at once.
   *
   * @adapted Carbon's duplicate-registration check is an assertion compiled
   *   out of release builds, so, as in a release build, a duplicate is not
   *   rejected. An Array of WeakRefs replaces Carbon's capacity-rounded block
   *   of non-owning pointers (see `_reloadNotifyTargets`).
   * @param {import("./IBlueAsyncResNotifyTarget.js").IBlueAsyncResNotifyTarget} target The target.
   */
  AddNotifyTarget(target)
  {
    if (this._isPrepared)
    {
      target.RebuildCachedData(this);
    }

    this._reloadNotifyTargets.push(new WeakRef(target));
  }

  /**
   * Carbon: BlueAsyncRes::RemoveNotifyTarget (blue/src/BlueAsyncRes.cpp:292-347)
   *
   * @adapted the Array of WeakRefs replaces Carbon's capacity-rounded block
   *   and is compacted in place in one pass, as Carbon's copy loop does; every
   *   entry equal to the target is removed, and so is every collected one. In
   *   place matters at scale: building a new array per call made tearing down
   *   20,000 owners of one resource take over a second.
   * @param {import("./IBlueAsyncResNotifyTarget.js").IBlueAsyncResNotifyTarget} target The target.
   */
  RemoveNotifyTarget(target)
  {
    const targets = this._reloadNotifyTargets;
    let found = false;
    let kept = 0;
    for (let i = 0; i < targets.length; ++i)
    {
      const current = targets[i].deref();
      if (current === target) found = true;
      else if (current !== undefined) targets[kept++] = targets[i];
    }
    targets.length = kept;
    if (!found) CcpLog.CCP_LOGERR("BlueAsyncRes::RemoveNotifyTarget - target not registered");
  }

  /**
   * Drops the WeakRefs of collected targets, in place.
   *
   * @cjs
   * @implemented
   */
  _PruneNotifyTargets()
  {
    const targets = this._reloadNotifyTargets;
    let kept = 0;
    for (let i = 0; i < targets.length; ++i)
    {
      if (targets[i].deref() !== undefined) targets[kept++] = targets[i];
    }
    targets.length = kept;
  }

  /**
   * Carbon: BlueAsyncRes::Reload (blue/src/BlueAsyncRes.cpp:370-375)
   *
   * @implemented
   */
  Reload()
  {
    blue.resMan._LogResourceEvent(this, "reloaded", "Reloading %s", this.GetPath());
    // Carbon opens the file afresh. Browser source/format caches must not join
    // the cancelled read or return its retained bytes for this explicit reload.
    blue.resMan.InvalidateReadCache(this.GetFilePath(), blue.resMan._GetResourceRequest(this));
    this.CancelPendingLoad();
    this._NotifyReleaseCachedData();
    this.Initialize(this._path, this._ext);
  }

  /**
   * Carbon: BlueAsyncRes::Initialize (blue/include/BlueAsyncRes.h:67-70)
   *
   * @implemented
   * @param {string} name Resource path, optionally with a `?query`.
   * @param {string} ext Requested extension.
   */
  Initialize(name, ext)
  {
    this._InitializeImpl(name, ext);
  }

  /**
   * Carbon: BlueAsyncRes::GetPath (blue/include/BlueAsyncRes.h:72-75)
   *
   * @implemented
   * @returns {string}
   */
  GetPath()
  {
    return this._path;
  }

  /**
   * Carbon: BlueAsyncRes::GetExt (blue/include/BlueAsyncRes.h:77-80)
   *
   * @implemented
   * @returns {string}
   */
  GetExt()
  {
    return this._ext;
  }

  /**
   * Carbon: BlueAsyncRes::IsLoading (blue/include/BlueAsyncRes.h:82-85)
   *
   * @implemented
   * @returns {boolean}
   */
  IsLoading()
  {
    return this._isLoading;
  }

  /**
   * Carbon: BlueAsyncRes::IsPrepared (blue/include/BlueAsyncRes.h:87-90)
   *
   * @implemented
   * @returns {boolean}
   */
  IsPrepared()
  {
    return this._isPrepared;
  }

  /**
   * Native good flag, with browser inactivity renewal before use.
   *
   * @adapted MotherLode.h:31-39 uses reference lifetime; JavaScript renews a timestamp.
   *   A failed resource stays failed until an explicit Reload.
   * @returns {boolean}
   */
  IsGood()
  {
    this.KeepAlive();
    return this._isGood;
  }

  /**
   * Carbon: BlueAsyncRes::GetFilePath (blue/src/BlueAsyncRes.cpp:444-455)
   *
   * @implemented
   * @returns {string} The path without its query.
   */
  GetFilePath()
  {
    const query = this._path.indexOf("?");
    return query !== -1 ? this._path.substring(0, query) : this._path;
  }

  /**
   * Carbon: BlueAsyncRes::GetQuery (blue/src/BlueAsyncRes.cpp:457-468)
   *
   * @implemented
   * @returns {string} The query after `?`, or an empty string.
   */
  GetQuery()
  {
    const query = this._path.indexOf("?");
    return query !== -1 ? this._path.substring(query + 1) : "";
  }

  /**
   * Carbon InitializeImpl (BlueAsyncRes.cpp:191-230), including its urgent-mode read.
   *
   * @adapted resMan retains the promise and cancellation token for asynchronous I/O.
   * @param {string} name
   * @param {string} ext
   */
  _InitializeImpl(name, ext)
  {
    this._queryArguments = [];
    const query = name.indexOf("?");
    if (query !== -1) this._ParseQuery(name.substring(query + 1));
    this._path = name;
    this._ext = ext;
    this._isPrepared = false;
    this._isGood = false;
    if (!name.length) return;

    this._isLoading = true;
    this._loadSucceeded = false;
    if (!this._isForcedSynchronous) this._isUrgent = blue.resMan.IsUrgentResourceLoads();
    blue.resMan._StartResourceLoad(this);
    if (this._isForcedSynchronous)
    {
      this._LoadAsync();
    }
    else
    {
      const flags = this._isUrgent ? IBlueCallbackMan.BCBF_URGENT : 0;
      this._loadCbId = blue.resMan.AddToQueue(BlueResManQueue.BRMQ_BACKGROUND, BlueAsyncRes._staticLoadAsync, this, flags);
    }
  }

  /**
   * Carbon: BlueAsyncRes::DoLoad (blue/include/BlueAsyncRes.h:112)
   *
   * Subclasses read `_dataStream` here.
   *
   * @implemented
   * @returns {number|Promise<number>} A `BlueAsyncRes.LoadingResult`.
   */
  _DoLoad()
  {
    return BlueAsyncRes.LoadingResult.LR_FAILED;
  }

  /**
   * Carbon: BlueAsyncRes::DoPrepare (blue/include/BlueAsyncRes.h:113)
   *
   * @implemented
   * @returns {boolean} Whether preparation succeeded.
   */
  _DoPrepare()
  {
    return false;
  }

  /**
   * Open the query-free path through Blue's configured source.
   *
   * @adapted the existing manager read cache preserves worker/source execution;
   *   this already-queued callback must not enqueue a second background read.
   * @returns {Promise<boolean>}
   */
  async _DoOpenStream()
  {
    const attempt = blue.resMan._GetResourceLoad(this);
    // Share one read context with decoding: a reload invalidates prior bytes
    // once, rather than invalidating its newly retained source at format read.
    const read = blue.resMan._BeginReadOperation(this.GetFilePath(), blue.resMan._GetResourceRequest(this));
    attempt.request = read.options;
    const data = await blue.resMan.ReadResource(this.GetFilePath(), read.options);
    blue.resMan._AssertResourceLoad(this, attempt);
    blue.resMan._LogResourceEvent(this, "read", "Read %s (%d bytes)", this.GetPath(), data?.byteLength ?? 0);
    this._dataStream = data === null ? null : { form: "bytes", data };
    return this._dataStream !== null;
  }

  /**
   * Carbon: BlueAsyncRes::OnShutdown (blue/include/BlueAsyncRes.h:123)
   *
   * @implemented
   */
  _OnShutdown() {}

  /**
   * Carbon: BlueAsyncRes::CleanupLoadData (blue/include/BlueAsyncRes.h:127)
   *
   * @implemented
   */
  _CleanupLoadData() {}

  /**
   * Carbon: BlueAsyncRes::StaticLoadAsync (blue/src/BlueAsyncRes.cpp:71-75)
   *
   * The load is asynchronous; its promise goes back to the callback manager,
   * which holds the queue slot until it settles.
   *
   * @implemented
   * @param {BlueAsyncRes} context The resource, the queue entry's context.
   * @returns {Promise<void>}
   */
  static _staticLoadAsync(context)
  {
    return context._LoadAsync();
  }

  /**
   * Native load phase, with asynchronous reads and attempt cancellation guards.
   *
   * @adapted logical background work queues prepare on MAIN even on the same
   *   JavaScript thread, so the existing main-thread time slice remains effective.
   * @returns {Promise<void>}
   */
  async _LoadAsync()
  {
    const attempt = blue.resMan._GetResourceLoad(this);
    let result = BlueAsyncRes.LoadingResult.LR_FAILED;
    let failure = null;
    try
    {
      if (await this._DoOpenStream())
      {
        blue.resMan._AssertResourceLoad(this, attempt);
        this._reservedMemory = this._dataStream?.data?.byteLength || 0;
        blue.resMan.ReserveBackgroundLoadMemory(this._reservedMemory);
        result = await this._DoLoad();
        blue.resMan._AssertResourceLoad(this, attempt);
      }
    }
    catch (error)
    {
      failure = error;
    }
    if (!blue.resMan._IsResourceLoadCurrent(this, attempt)) return;

    this._CloseStream();
    this._loadCbId = 0;
    this._loadSucceeded = result !== BlueAsyncRes.LoadingResult.LR_FAILED && !failure;
    this._notify = result !== BlueAsyncRes.LoadingResult.LR_SUCCESS_DONTNOTIFY;
    if (!this._loadSucceeded) blue.resMan._RecordResourceFailure(this, failure || new Error(
      "Failed to load resource: " + this.GetPath()));
    else blue.resMan._LogResourceEvent(this, "decoded", "Decoded %s", this.GetPath());
    const flags = this._isUrgent ? IBlueCallbackMan.BCBF_URGENT : 0;
    this._prepareCbId = blue.resMan.AddToQueue(BlueResManQueue.BRMQ_MAIN,
      this._loadSucceeded ? BlueAsyncRes._staticPrepareAsync : BlueAsyncRes._staticFailedLoadNotify,
      this, flags);
  }

  /**
   * Carbon: BlueAsyncRes::StaticPrepareAsync (blue/src/BlueAsyncRes.cpp:138-142)
   *
   * @implemented
   * @param {BlueAsyncRes} context The resource, the queue entry's context.
   */
  static _staticPrepareAsync(context)
  {
    context._PrepareAsync();
  }

  /**
   * Complete the native prepare phase and settle the manager operation before notifying owners.
   *
   * @implemented
   */
  _PrepareAsync()
  {
    const attempt = blue.resMan._GetResourceLoad(this);
    if (!blue.resMan._IsResourceLoadCurrent(this, attempt)) return;
    let good = false;
    try
    {
      good = this._DoPrepare();
      if (typeof good !== "boolean") throw new TypeError("Resource prepare must return a boolean.");
      this._CleanupLoadData();
    }
    catch (error)
    {
      blue.resMan._RecordResourceFailure(this, error);
      good = false;
    }
    if (!blue.resMan._IsResourceLoadCurrent(this, attempt)) return;
    this._prepareCbId = 0;
    this._isPrepared = true;
    this._isLoading = false;
    this._isGood = good;
    blue.resMan._FinishResourceLoad(this);
    if (this._notify) this._NotifyRebuildCachedData();
  }

    /**
   * Carbon StaticFailedLoadNotify (BlueAsyncRes.cpp:160-189).
   *
   * @adapted the resource also clears its queue id, records itself bad and
   *   settles resMan's load operation, so a waiting caller learns of the
   *   failure; it stays prepared but bad until an explicit Reload. Carbon's
   *   null-context check is dropped: the entry is always queued with its
   *   resource.
   * @param {BlueAsyncRes} context The resource, the queue entry's context.
   * @returns {void}
   */
  static _staticFailedLoadNotify(context)
  {
    const resource = context;
    resource._prepareCbId = 0;
    resource._isPrepared = true;
    resource._loadSucceeded = false;
    resource._isLoading = false;
    resource._isGood = false;
    resource._CleanupLoadData();
    blue.resMan._FinishResourceLoad(resource);
    resource._NotifyRebuildCachedData();
  }

  /**
   * Carbon: BlueAsyncRes::CloseStream (blue/src/BlueAsyncRes.cpp:392-404)
   *
   * Releases the reserved background-load memory and drops the stream.
   *
   * @implemented
   */
  _CloseStream()
  {
    if (this._reservedMemory)
    {
      blue.resMan.ReleaseBackgroundLoadMemory(this._reservedMemory);
      this._reservedMemory = 0;
    }

    if (this._dataStream)
    {
      this._dataStream = null;
    }
  }

  /**
   * Notify the persistent native targets; diagnose an owner that missed teardown.
   *
   * @adapted collected targets are skipped and dropped (see `_reloadNotifyTargets`).
   */
  _NotifyRebuildCachedData()
  {
    this._PruneNotifyTargets();
    for (let i = 0; i < this._reloadNotifyTargets.length; ++i)
    {
      // The dereferenced target stays live for its callback.
      const target = this._reloadNotifyTargets[i].deref();
      if (target === undefined) continue;
      if (BlueAsyncRes._destructedNotifyTargets.has(target))
      {
        throw new Error("Destructed resource notify target: " + CjsSchema.getClassName(target.constructor));
      }
      target.RebuildCachedData(this);
    }
  }

  /**
   * Carbon: BlueAsyncRes::NotifyReleaseCachedData (blue/src/BlueAsyncRes.cpp:362-368)
   *
   * @adapted collected targets are skipped and dropped (see `_reloadNotifyTargets`).
   */
  _NotifyReleaseCachedData()
  {
    this._PruneNotifyTargets();
    for (let i = 0; i < this._reloadNotifyTargets.length; ++i)
    {
      const target = this._reloadNotifyTargets[i].deref();
      if (target !== undefined) target.ReleaseCachedData(this);
    }
  }

  /**
   * Carbon: BlueAsyncRes::SetPrepared (blue/src/BlueAsyncRes.cpp:60-63)
   *
   * @implemented
   * @param {boolean} prepared
   */
  _SetPrepared(prepared)
  {
    this._isPrepared = !!prepared;
  }

  /**
   * Carbon: BlueAsyncRes::SetGood (blue/src/BlueAsyncRes.cpp:66-69)
   *
   * @implemented
   * @param {boolean} good
   */
  _SetGood(good)
  {
    this._isGood = !!good;
  }

  /**
   * Carbon: BlueAsyncRes::ParseQuery (blue/src/BlueAsyncRes.cpp:406-430)
   *
   * Splits `name=value&name&...` into `[name, value]` pairs; a bare name has an
   * empty value.
   *
   * @implemented
   * @param {string} query The text after `?`.
   */
  _ParseQuery(query)
  {
    const end = query.length;
    let start = 0;
    while (start < end)
    {
      let amp = query.indexOf("&", start);
      if (amp === -1)
      {
        amp = end;
      }
      const eq = query.indexOf("=", start);
      const argument = eq !== -1 && eq < amp
        ? [ query.substring(start, eq), query.substring(eq + 1, amp) ]
        : [ query.substring(start, amp), "" ];
      this._queryArguments.push(argument);
      start = amp + 1;
    }
  }

  /**
   * Carbon: BlueAsyncRes::FindFirstQueryArgumentByName (blue/src/BlueAsyncRes.cpp:432-442)
   *
   * @implemented
   * @param {string} name Argument name.
   * @returns {Array<string>|null} The first `[name, value]` pair with that name.
   */
  _FindFirstQueryArgumentByName(name)
  {
    for (const argument of this._queryArguments)
    {
      if (argument[0] === name)
      {
        return argument;
      }
    }
    return null;
  }


  /** Schema resource discovery; an internal CjsLoadingObject overrides this. */
  static isResource = true;

  /** Destroyed owner identities, retained weakly only for notification diagnostics. */
  static _destructedNotifyTargets = new WeakSet();

  /** Browser renewal timestamp, read by MotherLode without allocating per frame. */
  _lastUsedTime = 0;

  /**
   * Whether this instance is a domain resource for graph enumeration.
   *
   * @implemented
   */
  get isResource()
  {
    return this.constructor.isResource === true;
  }

  /**
   * Renew use; only a policy-purged resource revives, through its native Reload.
   *
   * @adapted
   * @param {object} [options] Deterministic activity values for tools/tests.
   */
  KeepAlive(options = undefined)
  {
    blue.resMan._KeepResourceAlive(this, options);
  }

  /**
   * Mark an owner's completed destruction for the next-notify diagnostic.
   * Ours: JavaScript has no native destructor assertion.
   *
   * @cjs
   * @implemented
   * @param {object} target
   */
  static markNotifyTargetDestructed(target)
  {
    BlueAsyncRes._destructedNotifyTargets.add(target);
  }

  /**
   * Assert the native destructor's empty-target invariant in teardown tests.
   *
   * @cjs
   * @implemented
   */
  AssertNoNotifyTargets()
  {
    this._PruneNotifyTargets();
    if (this._reloadNotifyTargets.length) throw new Error("Resource still has notify targets: " + this.GetPath());
  }

}

// Declared as data rather than with decorators, so Blue sources import without
// a transform. Field order follows BlueAsyncRes_Blue.cpp.
CjsSchema.decorateField(BlueAsyncRes, "_path", type.wstring, be.mapAttribute(be.READ, "path"));
CjsSchema.decorateField(BlueAsyncRes, "_ext", type.wstring, be.mapAttribute(be.READ, "ext"));
CjsSchema.decorateField(BlueAsyncRes, "isGood", be.mapPropertyReadOnly(), type.boolean);
CjsSchema.decorateField(BlueAsyncRes, "isPrepared", be.mapPropertyReadOnly(), type.boolean);
CjsSchema.decorateField(BlueAsyncRes, "isLoading", be.mapPropertyReadOnly(), type.boolean);
CjsSchema.decorateMethod(BlueAsyncRes, "Reload", be.mapMethodAndWrap());
CjsSchema.decorateMethod(BlueAsyncRes, "IsLoading", be.mapMethodAndWrap());
CjsSchema.decorateMethod(BlueAsyncRes, "IsPrepared", be.mapMethodAndWrap());
CjsSchema.decorateMethod(BlueAsyncRes, "IsGood", be.mapMethodAndWrap());
be.inherit(IBlueResource)(BlueAsyncRes, { kind: "class" });
CjsSchema.exposure.mapInterface(IBlueResource)(BlueAsyncRes);
// Carbon: BLUE_DEFINE_ABSTRACT( BlueAsyncRes ) (BlueAsyncRes_Blue.cpp:6).
CjsSchema.exposure.abstract(BlueAsyncRes);
be.define("BlueAsyncRes")(BlueAsyncRes);




