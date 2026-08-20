import { CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource } from '../../CjsResource.js';
import { assertResourcePayloadObject, resourcePayloadError, resourceFormatRequiredError } from '../../resourceBoundary.js';
import { ResourceRequirement } from '../../ResourceRequirement.js';

// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h

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
class Tr2GrannyStateRes extends CjsResource {
  /** Resolved animation path to its loaded resource, as Carbon's m_gStateAnimFiles. */
  #animations = new Map();

  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null) {
    if (payload === null) {
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("Tr2GrannyStateRes", payload);
    // The state machine is what makes it a GState. Carbon walks the animation
    // sets straight after, so an absent or malformed set list is worth
    // rejecting here rather than at the first bind.
    if (!payload.stateMachine) {
      throw resourcePayloadError("Tr2GrannyStateRes", "Expected a GState payload carrying stateMachine.");
    }
    if (payload.animationSets !== undefined && !Array.isArray(payload.animationSets)) {
      throw resourcePayloadError("Tr2GrannyStateRes", "animationSets must be an array of animation sets when present.");
    }
    super.SetPayload(payload);
    return this;
  }

  /**
   * Turn GSF source into this resource.
   *
   * `data` may be an already-projected GSF document or the raw reflected
   * Granny result. Bytes require `options.format` - a `CjsGr2Format`-shaped
   * reader - rather than an import, because every format here is a
   * tree-shakeable subpath and a resource that imports its reader drags the
   * whole of gr2 into anything that touches GState.
   *
   * @param {object|ArrayBuffer|ArrayBufferView} data GSF document, raw result, or bytes.
   * @param {object|null} [options] `{ format }` plus model values applied after the read.
   * @returns {Tr2GrannyStateRes} This resource.
   */
  DoLoad(data, options = null) {
    const {
      format = null,
      ...values
    } = options || {};
    let document = data;
    if (!data?.stateMachine) {
      // `readGsf`, not `read`: a `.gsf` and a `.gr2` are the same container
      // family read two different ways, and gr2 carries a separate entry point
      // for the state-machine one. Naming it here is the fallback for a caller
      // that passed a bare format; a registered route carries the reader name
      // as data, so the store's answer needs no such knowledge.
      const route = this.ResolveFormat(data, format ? {
        format,
        read: "readGsf"
      } : null);
      if (!route) throw resourceFormatRequiredError("Tr2GrannyStateRes", this.ext);
      document = route.Read(data);
    }
    this.#animations.clear();
    this.SetPayload(document);
    this.SetValues(values);
    return this;
  }

  /** The authored animation state graph. */
  GetStateMachine() {
    return this.GetPayload()?.stateMachine ?? null;
  }

  /** Named slots the state machine binds clips into. */
  GetAnimationSlots() {
    return this.GetPayload()?.animationSlots ?? [];
  }

  /** Animation sets, each naming external `.gr2` clips. */
  GetAnimationSets() {
    return this.GetPayload()?.animationSets ?? [];
  }

  /** Which model in the referenced geometry this graph drives, and its retarget source. */
  GetCharacterInfo() {
    return this.GetPayload()?.character ?? null;
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
   * @returns {string[]} Resolved animation resource paths.
   */
  GetGStateAnimFileRefPaths() {
    const seen = [];
    for (const set of this.GetAnimationSets()) {
      for (const reference of set?.sourceFileReferences || []) {
        const resolved = Tr2GrannyStateRes.ResolveAnimPath(reference, this.path);
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
  static ResolveAnimPath(reference, owner) {
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
    while (value.startsWith("../")) {
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
  SetAnimationResource(path, resource) {
    this.#animations.set(String(path), resource);
    return this;
  }

  /** The animation resource attached for a resolved reference, if any. */
  GetAnimationResource(path) {
    return this.#animations.get(String(path)) ?? null;
  }

  /**
   * Whether every referenced animation has been attached.
   *
   * Carbon gates binding on exactly this: the state machine cannot sample a
   * clip whose file has not arrived. A GSF that references nothing is fully
   * loaded once its own document is present, not before.
   *
   * @returns {boolean}
   */
  IsFullyLoaded() {
    if (!this.GetPayload()) return false;
    return this.GetGStateAnimFileRefPaths().every(path => this.#animations.has(path));
  }
  static payload = ResourceRequirement.GRANNY_STATE;
}
CjsSchema.define(Tr2GrannyStateRes, {
  className: "Tr2GrannyStateRes",
  family: "resources"
});

export { Tr2GrannyStateRes };
//# sourceMappingURL=Tr2GrannyStateRes.js.map
