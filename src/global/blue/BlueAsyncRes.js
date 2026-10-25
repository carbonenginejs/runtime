// Source: blue/include/BlueAsyncRes.h
// Source: blue/src/BlueAsyncRes.cpp
// Source: blue/src/BlueAsyncRes_Blue.cpp
import { exposure as be } from "#be";
import { CjsSchema, meta, type } from "#schema";
import * as CcpLog from "../logging/ccpLog.js";
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
 * Array.
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

  /** `m_reloadNotifyTargets` - the registered `IBlueAsyncResNotifyTarget`s. */
  _reloadNotifyTargets = [];

  /** `isGood` (MAP_PROPERTY_READONLY, _Blue.cpp:15-23). */
  get isGood()
  {
    return this.IsGood();
  }

  /** `isPrepared` (MAP_PROPERTY_READONLY, _Blue.cpp:24-29). */
  get isPrepared()
  {
    return this.IsPrepared();
  }

  /** `isLoading` (MAP_PROPERTY_READONLY, _Blue.cpp:30-35). */
  get isLoading()
  {
    return this.IsLoading();
  }

  /**
   * Carbon: BlueAsyncRes::Shutdown (blue/src/BlueAsyncRes.cpp:47-58)
   *
   * Cancels a pending load, then gives the subclass its `_OnShutdown`.
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
   */
  ForceSynchronousLoad()
  {
    this._isForcedSynchronous = true;
  }

  /**
   * Carbon: BlueAsyncRes::CancelPendingLoad (blue/src/BlueAsyncRes.cpp:233-254)
   *
   * Cancels a scheduled load or prepare. Safe on a prepared resource.
   */
  CancelPendingLoad()
  {
    const loadCbId = this._loadCbId;
    if (loadCbId)
    {
      blue.resMan.CancelFromQueue(BlueResManQueue.BRMQ_BACKGROUND, loadCbId);
      this._loadCbId = 0;
      this._isLoading = false;
    }

    const prepareCbId = this._prepareCbId;
    if (prepareCbId)
    {
      blue.resMan.CancelFromQueue(BlueResManQueue.BRMQ_MAIN, prepareCbId);
      this._prepareCbId = 0;
      this._isLoading = false;
    }

    this._CleanupLoadData();
  }

  /**
   * Carbon: BlueAsyncRes::AddNotifyTarget (blue/src/BlueAsyncRes.cpp:261-290)
   *
   * A target added to a prepared resource is notified at once.
   *
   * Adapted: Carbon's duplicate-registration check is an assertion compiled
   * out of release builds, so, as in a release build, a duplicate is not
   * rejected. The Array replaces Carbon's capacity-rounded block.
   *
   * @param {import("./IBlueAsyncResNotifyTarget.js").IBlueAsyncResNotifyTarget} target The target.
   */
  AddNotifyTarget(target)
  {
    if (this._isPrepared)
    {
      target.RebuildCachedData(this);
    }

    this._reloadNotifyTargets.push(target);
  }

  /**
   * Carbon: BlueAsyncRes::RemoveNotifyTarget (blue/src/BlueAsyncRes.cpp:292-347)
   *
   * Adapted: the Array replaces Carbon's capacity-rounded block and is
   * compacted in place, as Carbon's copy loop does; every entry equal to the
   * target is removed. In place matters at scale: building a new array per
   * call made tearing down 20,000 owners of one resource take over a second.
   *
   * @param {import("./IBlueAsyncResNotifyTarget.js").IBlueAsyncResNotifyTarget} target The target.
   */
  RemoveNotifyTarget(target)
  {
    let index = this._reloadNotifyTargets.indexOf(target);
    if (index === -1)
    {
      CcpLog.CCP_LOGERR("BlueAsyncRes::RemoveNotifyTarget - target not registered");
      return;
    }

    while (index !== -1)
    {
      this._reloadNotifyTargets.splice(index, 1);
      index = this._reloadNotifyTargets.indexOf(target, index);
    }
  }

  /**
   * Carbon: BlueAsyncRes::Reload (blue/src/BlueAsyncRes.cpp:370-375)
   */
  Reload()
  {
    this.CancelPendingLoad();
    this._NotifyReleaseCachedData();
    this.Initialize(this._path, this._ext);
  }

  /**
   * Carbon: BlueAsyncRes::Initialize (blue/include/BlueAsyncRes.h:67-70)
   *
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
   * @returns {string}
   */
  GetPath()
  {
    return this._path;
  }

  /**
   * Carbon: BlueAsyncRes::GetExt (blue/include/BlueAsyncRes.h:77-80)
   *
   * @returns {string}
   */
  GetExt()
  {
    return this._ext;
  }

  /**
   * Carbon: BlueAsyncRes::IsLoading (blue/include/BlueAsyncRes.h:82-85)
   *
   * @returns {boolean}
   */
  IsLoading()
  {
    return this._isLoading;
  }

  /**
   * Carbon: BlueAsyncRes::IsPrepared (blue/include/BlueAsyncRes.h:87-90)
   *
   * @returns {boolean}
   */
  IsPrepared()
  {
    return this._isPrepared;
  }

  /**
   * Carbon: BlueAsyncRes::IsGood (blue/include/BlueAsyncRes.h:92-95)
   *
   * @returns {boolean}
   */
  IsGood()
  {
    return this._isGood;
  }

  /**
   * Carbon: BlueAsyncRes::GetFilePath (blue/src/BlueAsyncRes.cpp:444-455)
   *
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
   * @returns {string} The query after `?`, or an empty string.
   */
  GetQuery()
  {
    const query = this._path.indexOf("?");
    return query !== -1 ? this._path.substring(query + 1) : "";
  }

  /**
   * Carbon: BlueAsyncRes::InitializeImpl (blue/src/BlueAsyncRes.cpp:191-230)
   *
   * Records the path and extension, resets the state and schedules the load.
   *
   * Adapted: a forced-synchronous load starts here but cannot finish here,
   * because the browser's file reads are asynchronous; the started load is
   * not awaited.
   *
   * @param {string} name Resource path, optionally with a `?query`.
   * @param {string} ext Requested extension.
   */
  _InitializeImpl(name, ext)
  {
    this._queryArguments = [];
    const query = name.indexOf("?");
    if (query !== -1)
    {
      this._ParseQuery(name.substring(query + 1));
    }
    this._path = name;

    CcpLog.CCP_LOG("BlueAsyncRes::Initialize: %s", name);

    this._ext = ext;

    this._isPrepared = false;
    this._isGood = false;

    if (this._path.length > 0)
    {
      this._isLoading = true;
      this._loadSucceeded = false;
      if (this._isForcedSynchronous)
      {
        this._LoadAsync();
      }
      else
      {
        this._isUrgent = blue.resMan.IsUrgentResourceLoads();
        const flags = this._isUrgent ? IBlueCallbackMan.BCBF_URGENT : 0;
        this._loadCbId = blue.resMan.AddToQueue(BlueResManQueue.BRMQ_BACKGROUND, BlueAsyncRes._staticLoadAsync, this, flags);
      }
    }
  }

  /**
   * Carbon: BlueAsyncRes::DoLoad (blue/include/BlueAsyncRes.h:112)
   *
   * Subclasses read `_dataStream` here.
   *
   * @returns {number|Promise<number>} A `BlueAsyncRes.LoadingResult`.
   */
  _DoLoad()
  {
    return BlueAsyncRes.LoadingResult.LR_FAILED;
  }

  /**
   * Carbon: BlueAsyncRes::DoPrepare (blue/include/BlueAsyncRes.h:113)
   *
   * @returns {boolean} Whether preparation succeeded.
   */
  _DoPrepare()
  {
    return false;
  }

  /**
   * Carbon: BlueAsyncRes::DoOpenStream (blue/src/BlueAsyncRes.cpp:377-390)
   *
   * Opens the file without its query.
   *
   * Adapted: asynchronous, because the paths service reads asynchronously
   * (`CjsBluePaths.GetStreamFromPath`, Carbon's `GetStreamFromPathW`); the
   * stream output parameter becomes `_dataStream`, set from the returned value.
   *
   * @returns {Promise<boolean>} Whether the file was found.
   */
  async _DoOpenStream()
  {
    this._dataStream = await blue.paths.GetStreamFromPath(this.GetFilePath());
    return this._dataStream !== null;
  }

  /**
   * Carbon: BlueAsyncRes::OnShutdown (blue/include/BlueAsyncRes.h:123)
   */
  _OnShutdown() {}

  /**
   * Carbon: BlueAsyncRes::CleanupLoadData (blue/include/BlueAsyncRes.h:127)
   */
  _CleanupLoadData() {}

  /**
   * Carbon: BlueAsyncRes::StaticLoadAsync (blue/src/BlueAsyncRes.cpp:71-75)
   *
   * Adapted: the resource manager's queue passes the context as `this` and a
   * task record as the argument (`CjsResManWorkQueue.Add`), so the resource
   * Carbon receives as `pContext` arrives as `this`.
   *
   * @returns {Promise<void>}
   */
  static _staticLoadAsync()
  {
    return this._LoadAsync();
  }

  /**
   * Carbon: BlueAsyncRes::LoadAsync (blue/src/BlueAsyncRes.cpp:77-136)
   *
   * Opens and loads the file, then queues prepare, or the failure notice, on
   * the main queue.
   *
   * Adapted: asynchronous, because opening the file is (`_DoOpenStream`); a
   * subclass's `_DoLoad` may also return a promise. Carbon writes the queued
   * request id through an output parameter; `AddToQueue` returns it.
   *
   * @returns {Promise<void>}
   */
  async _LoadAsync()
  {
    let load = BlueAsyncRes.LoadingResult.LR_FAILED;
    if (await this._DoOpenStream())
    {
      // Carbon throttles loads on the assumption that a resource reads its
      // whole file on the background thread (cpp:89-96).
      if (this._dataStream)
      {
        this._reservedMemory = this._dataStream.data.byteLength;
        blue.resMan.ReserveBackgroundLoadMemory(this._reservedMemory);
      }

      load = await this._DoLoad();

      this._CloseStream();
    }
    const loadSucceeded = load !== BlueAsyncRes.LoadingResult.LR_FAILED;

    this._notify = load !== BlueAsyncRes.LoadingResult.LR_SUCCESS_DONTNOTIFY;

    const flags = this._isUrgent ? IBlueCallbackMan.BCBF_URGENT : 0;

    if (loadSucceeded)
    {
      this._loadSucceeded = true;
      if (blue.resMan.IsOnMainThread())
      {
        this._PrepareAsync();
      }
      else
      {
        this._prepareCbId = blue.resMan.AddToQueue(BlueResManQueue.BRMQ_MAIN, BlueAsyncRes._staticPrepareAsync, this, flags);
      }
    }
    else
    {
      CcpLog.CCP_LOGWARN("BlueAsyncRes::LoadAsync: Failed to load '%s'", this.GetPath());

      this._prepareCbId = blue.resMan.AddToQueue(BlueResManQueue.BRMQ_MAIN, BlueAsyncRes._staticFailedLoadNotify, this, flags);
    }

    this._loadCbId = 0;
  }

  /**
   * Carbon: BlueAsyncRes::StaticPrepareAsync (blue/src/BlueAsyncRes.cpp:138-142)
   *
   * Adapted: the queue's context arrives as `this` (see `_staticLoadAsync`).
   */
  static _staticPrepareAsync()
  {
    this._PrepareAsync();
  }

  /**
   * Carbon: BlueAsyncRes::PrepareAsync (blue/src/BlueAsyncRes.cpp:144-172)
   *
   * Prepares on the main queue, records the outcome and notifies the targets.
   */
  _PrepareAsync()
  {
    const isGood = this._DoPrepare();

    this._CleanupLoadData();

    this._prepareCbId = 0;
    this._isPrepared = true;

    // Loading is finished, regardless of success.
    this._isLoading = false;

    if (isGood)
    {
      this._isGood = true;
    }

    if (this._notify)
    {
      this._NotifyRebuildCachedData();
    }
  }

  /**
   * Carbon: BlueAsyncRes::StaticFailedLoadNotify (blue/src/BlueAsyncRes.cpp:174-189)
   *
   * Finishes a failed load on the main queue, so the targets hear of it.
   *
   * Adapted: the queue's context arrives as `this` (see `_staticLoadAsync`).
   */
  static _staticFailedLoadNotify()
  {
    /** @type {BlueAsyncRes} */
    const pThis = this;
    if (!pThis)
    {
      CcpLog.CCP_LOGERR("BlueAsyncRes::StaticFailedLoadNotify: pContext is NULL!  Debug this, its important");
      return;
    }
    // Loading is finished, regardless of success.
    pThis._isPrepared = true;
    pThis._loadSucceeded = false;
    pThis._isLoading = false;
    pThis._CleanupLoadData();

    pThis._NotifyRebuildCachedData();
  }

  /**
   * Carbon: BlueAsyncRes::CloseStream (blue/src/BlueAsyncRes.cpp:392-404)
   *
   * Releases the reserved background-load memory and drops the stream.
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
   * Carbon: BlueAsyncRes::NotifyRebuildCachedData (blue/src/BlueAsyncRes.cpp:354-360)
   */
  _NotifyRebuildCachedData()
  {
    for (let i = 0; i < this._reloadNotifyTargets.length; ++i)
    {
      this._reloadNotifyTargets[i].RebuildCachedData(this);
    }
  }

  /**
   * Carbon: BlueAsyncRes::NotifyReleaseCachedData (blue/src/BlueAsyncRes.cpp:362-368)
   */
  _NotifyReleaseCachedData()
  {
    for (let i = 0; i < this._reloadNotifyTargets.length; ++i)
    {
      this._reloadNotifyTargets[i].ReleaseCachedData(this);
    }
  }

  /**
   * Carbon: BlueAsyncRes::SetPrepared (blue/src/BlueAsyncRes.cpp:60-63)
   *
   * @param {boolean} prepared
   */
  _SetPrepared(prepared)
  {
    this._isPrepared = !!prepared;
  }

  /**
   * Carbon: BlueAsyncRes::SetGood (blue/src/BlueAsyncRes.cpp:66-69)
   *
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
}

// Declared as data rather than with decorators, so Blue sources import without
// a transform. Field order follows BlueAsyncRes_Blue.cpp.
CjsSchema.decorateField(BlueAsyncRes, "_path", type.wstring, be.mapAttribute(be.READ, "path"));
CjsSchema.decorateField(BlueAsyncRes, "_ext", type.wstring, be.mapAttribute(be.READ, "ext"));
CjsSchema.decorateField(BlueAsyncRes, "isGood", be.mapPropertyReadOnly(), type.boolean, meta.implemented);
CjsSchema.decorateField(BlueAsyncRes, "isPrepared", be.mapPropertyReadOnly(), type.boolean, meta.implemented);
CjsSchema.decorateField(BlueAsyncRes, "isLoading", be.mapPropertyReadOnly(), type.boolean, meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "Shutdown", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "ForceSynchronousLoad", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "CancelPendingLoad", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "AddNotifyTarget", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "RemoveNotifyTarget", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "Reload", be.mapMethodAndWrap(), meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "Initialize", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "GetPath", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "GetExt", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "IsLoading", be.mapMethodAndWrap(), meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "IsPrepared", be.mapMethodAndWrap(), meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "IsGood", be.mapMethodAndWrap(), meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "GetFilePath", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "GetQuery", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_InitializeImpl", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "_DoLoad", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_DoPrepare", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_DoOpenStream", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "_OnShutdown", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_CleanupLoadData", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_staticLoadAsync", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "_LoadAsync", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "_staticPrepareAsync", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "_PrepareAsync", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_staticFailedLoadNotify", meta.adapted);
CjsSchema.decorateMethod(BlueAsyncRes, "_CloseStream", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_NotifyRebuildCachedData", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_NotifyReleaseCachedData", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_SetPrepared", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_SetGood", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_ParseQuery", meta.implemented);
CjsSchema.decorateMethod(BlueAsyncRes, "_FindFirstQueryArgumentByName", meta.implemented);
be.inherit(IBlueResource)(BlueAsyncRes, { kind: "class" });
CjsSchema.exposure.mapInterface(IBlueResource)(BlueAsyncRes);
// Carbon: BLUE_DEFINE_ABSTRACT( BlueAsyncRes ) (BlueAsyncRes_Blue.cpp:6).
CjsSchema.exposure.abstract(BlueAsyncRes);
be.define("BlueAsyncRes")(BlueAsyncRes);
