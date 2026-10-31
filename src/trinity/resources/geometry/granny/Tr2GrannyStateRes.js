import { blue as blueService } from "#blue/blue";
import { exposure as be } from "#be";
// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h
import { CjsSchema, meta } from "#schema";
import { BlueAsyncRes, ICacheable } from "#blue";
import { assertResourcePayloadObject, resourceFormatRequiredError, resourcePayloadError } from "../../../../resource/resourceBoundary.js";

/**
 * Runtime-owned GState resource.
 *
 * A `.gsf` is a Granny container whose root is a character animation STATE
 * MACHINE rather than geometry: the state graph, the animation slots it binds
 * clips into, and animation sets that reference external `.gr2` animation
 * files by relative path. It carries no geometry and no skeleton — the
 * skeleton lives in the referenced `.gr2`.
 *
 * Carbon's `Tr2GrannyStateRes` holds the parsed container plus a map of those
 * referenced animations loaded as separate `TriGrannyRes`, and binds them
 * through `GStateBindCharacterFileReferences`. `Tr2GStateAnimation` is the
 * consumer: named parameters drive the state machine, active states sample
 * clips from the referenced sets, and the composited pose becomes bone
 * matrices for skinning.
 *
 * THE GUARD THIS REPLACES WAS FABRICATED. It demanded `skeleton` or an
 * `additiveAnimations` array — two fields that appear in no reader output, no
 * Carbon struct, and no schema. `CjsGr2Format.readGsf` returns
 * `{format, container, character, stateMachine, animationSlots, animationSets,
 * uniqueTokenCount, editorData, extendedData}`, so the guard rejected 100% of
 * the only GSF data this organization can produce. It survived because its
 * test built a literal to satisfy the guard rather than reading a file, which
 * is a test proving its own premise.
 */
export class Tr2GrannyStateRes extends BlueAsyncRes
{
  /** Resolved animation path to its loaded resource, as Carbon's m_gStateAnimFiles. */
  _animations = new Map();

  /** m_dataSize: the byte length of the file `DoLoad` read, or 0 when handed a document. */
  _dataSize = 0;




  /**
   * Carbon DoLoad (Tr2GrannyStateRes.cpp:47-76), through the configured GSF reader.
   * Browser decoding completes before replacing the owning resource's state graph.
   *
   * @adapted
   * @returns {Promise<number>} Native LoadingResult.
   */
  async _DoLoad()
  {
    const bytes = this._dataStream.data;
    const payload = await blueService.resMan.ReadResourceObjectPayload(this, bytes);
    this._animations.clear();
    this._dataSize = bytes.byteLength || 0;
    assertResourcePayloadObject("Tr2GrannyStateRes", payload);
    // The state machine is what makes it a GState. Carbon walks the animation
    // sets straight after, so an absent or malformed set list is worth
    // rejecting here rather than at the first bind.
    if (!payload.stateMachine)
    {
      throw resourcePayloadError(
        "Tr2GrannyStateRes",
        "Expected a GState payload carrying stateMachine."
      );
    }
    if (payload.animationSets !== undefined && !Array.isArray(payload.animationSets))
    {
      throw resourcePayloadError(
        "Tr2GrannyStateRes",
        "animationSets must be an array of animation sets when present."
      );
    }
    this._gStateFile = payload;
    return BlueAsyncRes.LoadingResult.LR_SUCCESS;
  }

  /**
   * The authored animation state graph.
   *
   * @cjs
   * @implemented
   */
  GetStateMachine()
  {
    return this._gStateFile?.stateMachine ?? null;
  }

  /**
   * Named slots the state machine binds clips into.
   *
   * @cjs
   * @implemented
   */
  GetAnimationSlots()
  {
    return this._gStateFile?.animationSlots ?? [];
  }

  /**
   * Animation sets, each naming external `.gr2` clips.
   *
   * @cjs
   * @implemented
   */
  GetAnimationSets()
  {
    return this._gStateFile?.animationSets ?? [];
  }

  /**
   * Which model in the referenced geometry this graph drives, and its retarget source.
   *
   * @adapted
   */
  GetCharacterInfo()
  {
    return this._gStateFile?.character ?? null;
  }

  /**
   * Every referenced `.gr2` animation path, resolved against this resource and
   * deduplicated, in first-seen order.
   *
   * References are authored RELATIVE to the `.gsf` - `../anim/idle.gr2` - so a
   * consumer that requests them verbatim asks for a path that does not exist.
   * Carbon resolves them the same way in `GetFullAnimPath`
   * (`Tr2GrannyStateRes.cpp:80-103`), which is ported here rather than
   * reinvented.
   *
   * @adapted
   * @returns {string[]} Resolved animation resource paths.
   */
  GetGStateAnimFileRefPaths()
  {
    const seen = [];
    for (const set of this.GetAnimationSets())
    {
      for (const reference of (set?.sourceFileReferences || []))
      {
        const resolved = Tr2GrannyStateRes.ResolveAnimPath(reference, this.GetPath());
        if (resolved && !seen.includes(resolved)) seen.push(resolved);
      }
    }
    return seen;
  }

  /**
   * Resolve one authored reference against the GSF's own directory.
   *
   * Ported from Carbon `Tr2GrannyStateRes.cpp:80-103`: drop the file name, walk
   * up one directory per leading `..`, drop a leading `.`, join, and normalize
   * separators. An absolute `res:/` reference is returned as-is, since nothing
   * relative can be meant by it.
   *
   * @param {string} reference Authored, usually relative, reference.
   * @param {string} owner Path of the `.gsf` that carries it.
   * @returns {string} Resolved path.
   */
  static ResolveAnimPath(reference, owner)
  {
    let value = String(reference || "").replace(/\\/gu, "/");
    if (!value) return "";
    if (/^[a-z]+:\//iu.test(value)) return value;

    let directory = String(owner || "").replace(/\\/gu, "/");
    const cut = directory.lastIndexOf("/");
    directory = cut === -1 ? "" : directory.slice(0, cut);

    // Carbon tests `substr(0, 2) == ".."` and then erases three characters,
    // which mangles a file whose NAME begins with two dots. Matching the
    // separator too cannot break a legitimate relative path and cannot corrupt
    // a name, so the guard is tightened rather than ported verbatim.
    while (value.startsWith("../"))
    {
      value = value.slice(3);
      const up = directory.lastIndexOf("/");
      directory = up === -1 ? "" : directory.slice(0, up);
    }
    if (value.startsWith("./")) value = value.slice(2);

    return directory ? `${directory}/${value}` : value;
  }

  /**
   * Attach a loaded animation resource for one resolved reference.
   *
   * Carbon keeps the same map (`m_gStateAnimFiles`) and binds the whole set
   * once every reference is present. Who fetches them is the caller's business;
   * this resource only records what has arrived.
   *
   * @param {string} path Resolved animation path.
   * @param {*} resource Loaded animation resource.
   * @returns {Tr2GrannyStateRes} This resource.
   */
  SetAnimationResource(path, resource)
  {
    this._animations.set(String(path), resource);
    return this;
  }

  /** The animation resource attached for a resolved reference, if any. */
  GetAnimationResource(path)
  {
    return this._animations.get(String(path)) ?? null;
  }

  /**
   * Whether every referenced animation has been attached.
   *
   * Carbon gates binding on exactly this: the state machine cannot sample a
   * clip whose file has not arrived. A GSF that references nothing is fully
   * loaded once its own document is present, not before.
   *
   * @adapted
   * @returns {boolean}
   */
  IsFullyLoaded()
  {
    if (!this._gStateFile) return false;
    return this.GetGStateAnimFileRefPaths().every(path => this._animations.has(path));
  }


  /**
   * Carbon `IsMemoryUsageKnown` (Tr2GrannyStateRes.cpp:32-35): known once loaded.
   *
   * @implemented
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (Tr2GrannyStateRes.cpp:37-47): the file's size plus
   * the character-file pointer while a file is held, otherwise 1024.
   *
   * @adapted a document decoded elsewhere arrives without its file, so it
   *   reports the 1024 Carbon reports with no file.
   * @returns {number} Bytes.
   */
  GetMemoryUsage()
  {
    // sizeof( m_characterFile ): one 64-bit pointer.
    return this._dataSize ? this._dataSize + 8 : 1024;
  }


  /** m_gStateFile: the decoded browser GState projection. */
  _gStateFile = null;

  /**
   * Explicitly drop owned state and animation references at JS teardown.
   *
   * @adapted explicit JS teardown replaces native destruction; the existing
   *   MotherLode switches keep CPU data and opaque adapter cleanup independent.
   * @param {object} [options={}] Existing MotherLode cleanup policy.
   * @param {boolean} [options.releasePayload=true] Release owned family data.
   * @param {boolean} [options.destroyAdapters=true] Destroy opaque device adapter slots.
   * @returns {void}
   */
  _OnShutdown(options = {})
  {
    if (options.releasePayload === false) return;
    this._animations.clear();
    this._gStateFile = null;
    this._dataSize = 0;
  }

  /**
   * Carbon DoPrepare (Tr2GrannyStateRes.cpp:164-168) reports success after
   * starting animation acquisition. Adapted: GState SDK binding is not ported;
   * the existing explicit animation-resource map remains the binding input.
   *
   * @adapted
   * @returns {boolean} The decoded state file is ready for its consumer.
   */
  _DoPrepare()
  {
    return this._gStateFile !== null;
  }

}


CjsSchema.decorateMethod(Tr2GrannyStateRes, "_DoLoad", meta.adapted);
CjsSchema.decorateMethod(Tr2GrannyStateRes, "GetCharacterInfo", meta.adapted);
CjsSchema.decorateMethod(Tr2GrannyStateRes, "GetGStateAnimFileRefPaths", meta.adapted);
CjsSchema.decorateMethod(Tr2GrannyStateRes, "IsFullyLoaded", meta.adapted);
CjsSchema.decorateMethod(Tr2GrannyStateRes, "IsMemoryUsageKnown", meta.implemented);
CjsSchema.decorateMethod(Tr2GrannyStateRes, "GetMemoryUsage", meta.adapted);
CjsSchema.exposure.mapICacheableMethods()(Tr2GrannyStateRes);
CjsSchema.exposure.define("Tr2GrannyStateRes")(Tr2GrannyStateRes);
be.inherit(ICacheable)(Tr2GrannyStateRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(Tr2GrannyStateRes);
// Carbon: Tr2GrannyStateRes::ExposeToBlue (trinity/trinity/Resources/Tr2GrannyStateRes_Blue.cpp:30).
CjsSchema.blue.chainTo(BlueAsyncRes)(Tr2GrannyStateRes);

CjsSchema.decorateMethod(Tr2GrannyStateRes, "_OnShutdown", meta.adapted);

CjsSchema.decorateMethod(Tr2GrannyStateRes, "_DoPrepare", meta.adapted);

CjsSchema.decorateMethod(Tr2GrannyStateRes, "GetStateMachine", CjsSchema.meta.cjs, CjsSchema.meta.implemented);

CjsSchema.decorateMethod(Tr2GrannyStateRes, "GetAnimationSlots", CjsSchema.meta.cjs, CjsSchema.meta.implemented);

CjsSchema.decorateMethod(Tr2GrannyStateRes, "GetAnimationSets", CjsSchema.meta.cjs, CjsSchema.meta.implemented);
