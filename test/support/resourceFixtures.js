// Fixtures drive native hooks directly; production acquisition goes through blue.resMan.
import { blue, BlueAsyncRes } from "../../npm/dist/blue/blue/index.js";

/** Complete a synthetic load and broadcast the native persistent notification. */
export function prepareResourceFixture(resource)
{
  resource._isLoading = false;
  resource._isPrepared = true;
  resource._isGood = true;
  blue.resMan._GetResourceRecord(resource).purged = false;
  blue.resMan._FinishResourceLoad(resource);
  resource._NotifyRebuildCachedData();
  return resource;
}

/** Feed an effect container through its synchronous native load hook. */
export function readEffectFixture(resource, bytes)
{
  resource._dataStream = { form: "bytes", data: bytes };
  try
  {
    if (resource._DoLoad() !== BlueAsyncRes.LoadingResult.LR_SUCCESS)
      throw new Error("Effect fixture failed to load.");
    return resource;
  }
  finally { resource._dataStream = null; }
}

/** Give a consumer-only fixture an identity without starting asynchronous I/O. */
export function resourceIdentityFixture(resource, path, ex = "")
{
  resource._path = path;
  resource._ext = ex;
  return resource;
}

/** Hold a synthetic native attempt until the fixture explicitly completes it. */
export function pendingResourceFixture(resource)
{
  resource._isLoading = true;
  resource._isPrepared = false;
  resource._isGood = false;
  blue.resMan._StartResourceLoad(resource);
  return resource;
}

/** Complete a synthetic native attempt with a sticky failure. */
export function failResourceFixture(resource, error)
{
  blue.resMan._FailResourceLoad(resource, error);
  return resource;
}

/** Simulate full manager eviction, including native owner notification. */
export function purgeResourceFixture(resource)
{
  resource._NotifyReleaseCachedData();
  blue.resMan._MarkResourcePurged(resource);
  return resource;
}
