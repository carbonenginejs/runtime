// Getting per-object bytes onto the GPU, and only when they changed.
//
// The Trinity side of this is finished and is not repeated here: 29 producers
// populate per-object data, every layout has live allocations, and
// `Tr2PerObjectData.getConstantRecords(objectData, shaderTypeMask)` already
// answers which payload binds to which stages for a technique. What was missing
// was the last step - an uploader that reads `GetData()` and honours
// `IsDirty()` / `ClearDirty()`.
//
// SCOPE, DELIBERATELY SMALL. This owns dirty filtering, byte extraction and
// commit ordering. It does NOT decide which payload binds where: that join is
// Trinity's stage mask plus the package's binding identity, and an engine
// inventing it would be inventing scene structure. Pairs arrive already
// decided.
//
// THE FLAG IS A WRITE BARRIER. RawData's `Set`, `SetAndTranspose`, `Zero`,
// `CopyFrom`, and explicit `Invalidate` all mark a record dirty. A successful
// upload clears that state; the next producer write re-arms it. Engines consume
// the terminal packed bytes and never reinterpret a field or transpose it.
//
// TWO-PHASE ON PURPOSE. Clearing before the bytes are actually on the device
// would lose an update whenever the upload throws: the payload would claim to
// match a buffer that was never written. So collecting and committing are
// separate calls and the commit is the caller's to make after the upload
// succeeds. That ordering cannot be got wrong by accident, which is the point.
//
// TRANSIENT RECORDS USE THE SAME LIFECYCLE. `ClearDirty` means "these bytes have
// been uploaded". Filling a reused arena record on a later frame marks it dirty
// again, so it cannot be skipped merely because an earlier lease was committed.

function fail(message)
{
  const error = new Error(`CjsWebgpuPerObjectUploader: ${message}`);
  error.code = "CJS_WEBGPU_PER_OBJECT_UPLOAD_INVALID";
  throw error;
}


/**
 * Collects the payloads that need uploading into one `uniformData` record.
 *
 * `pairs` is `[{ identity, payload }]`. During the pre-consolidation transition
 * this function still accepts the historical RawData-shaped payload and treats
 * a payload with no dirty protocol as always dirty. The combined runtime makes
 * `CjsConstantPayload` the required nominal identity and removes this fallback.
 *
 * `force` uploads everything regardless, which is what a freshly created
 * binding set needs: its buffers hold nothing yet, so a clean payload is still
 * absent from the device.
 */
export function CollectPerObjectUploads(pairs, options = {})
{
  if (!Array.isArray(pairs)) fail("pairs must be an array");

  const force = options.force === true;
  const uniformData = {};
  const pending = [];
  const seen = new Set();

  for (const pair of pairs)
  {
    const identity = pair?.identity;
    const payload = pair?.payload;

    if (typeof identity !== "string" || !identity) fail("every pair requires a binding identity");
    if (typeof payload?.GetData !== "function") fail(`payload for ${identity} exposes no GetData`);
    if (seen.has(identity)) fail(`binding identity ${identity} is uploaded twice in one collection`);
    seen.add(identity);

    const dirty = typeof payload.IsDirty === "function" ? payload.IsDirty() === true : true;
    if (!force && !dirty) continue;

    const data = payload.GetData();
    if (!ArrayBuffer.isView(data)) fail(`payload for ${identity} did not return a typed array`);

    uniformData[identity] = data;
    pending.push(payload);
  }

  return Object.freeze({
    uniformData,
    pending: Object.freeze(pending),
    // A collection with nothing in it is the normal steady state for a static
    // object, and skipping the write entirely is the whole point of the flag.
    isEmpty: pending.length === 0
  });
}


/**
 * Marks collected payloads as uploaded.
 *
 * Call only after the write succeeded. The optional call is retained only for
 * the pre-consolidation structural compatibility path; the combined runtime's
 * nominal constant-payload contract requires `ClearDirty`.
 */
export function CommitPerObjectUploads(collection)
{
  const pending = collection?.pending;
  if (!Array.isArray(pending)) fail("a collection from CollectPerObjectUploads is required");

  for (const payload of pending) payload.ClearDirty?.();

  return pending.length;
}


/**
 * Collects, uploads through a caller-supplied write, then commits.
 *
 * The convenience form for the common case, with the ordering built in: a
 * throwing write leaves every flag set, so the next frame retries rather than
 * silently keeping a buffer that was never written.
 */
export function UploadPerObjectData(pairs, write, options = {})
{
  if (typeof write !== "function") fail("a write function is required");

  const collection = CollectPerObjectUploads(pairs, options);
  if (collection.isEmpty) return collection;

  write(collection.uniformData);
  CommitPerObjectUploads(collection);

  return collection;
}
