import { normalizeResourceExtension } from "@carbonenginejs/runtime-utils/path";

/**
 * One registered route: an extension, the format that reads it, the reader to
 * call, and the output to ask for.
 *
 * The unit is deliberately not a bare format class. A format class does not
 * answer the question "how is this file read", because three separate things
 * can vary independently and every one of them is live in this package:
 *
 * - **Several formats under one extension.** `.static` is read by both
 *   `CjsStaticFormat` and `CjsSchemaBoundFormat`, and only content tells them
 *   apart.
 * - **Several readers on one format, chosen by CONTENT.** `CjsGr2Format` reads
 *   `.gr2` and `.gsf` through the same `readRawInput`, because they are the
 *   same Granny container — the suffix only denotes what the root object holds.
 *   `read` projects geometry and `readGsf` projects a state machine, and
 *   `isGsf` is what actually tells them apart. The extension is a hint, not the
 *   discriminator, which is why a route may carry its own `accepts` probe.
 * - **Several outputs from one reader.** `CjsDdsFormat` declares
 *   `outputTypes: ["texture", "image", "rgba"]` off a single `read`, selected
 *   by `options.emit`.
 *
 * ccpwgl mapped one extension to one constructor and stopped, which is why
 * every one of those cases has to be hardcoded at a call site there. Naming the
 * route makes them registration data instead - and the resource that reads a
 * `.gsf` no longer has to know that the method is called `readGsf`.
 */
class CjsFormatRoute
{
  constructor(Format, options = {})
  {
    this.Format = Format;
    this.read = options.read || "read";
    this.output = options.output || null;
    this.accepts = options.accepts || null;
    this.name = options.name || `${Format.name || "format"}.${this.read}`;

    if (typeof Format[this.read] !== "function")
    {
      throw new TypeError(
        `${Format.name || "format"} has no reader named ${JSON.stringify(this.read)}. `
        + "A route names the entry point to call, so a misspelling here would "
        + "otherwise surface as a failed load of the first matching file."
      );
    }
    if (this.accepts !== null
      && typeof this.accepts !== "function"
      && typeof Format[this.accepts] !== "function")
    {
      throw new TypeError(
        `${Format.name || "format"} has no probe named ${JSON.stringify(this.accepts)}. `
        + "A route's probe is what separates two readers over one container, so "
        + "a missing one would silently route every file to the first route."
      );
    }
    if (this.output && Array.isArray(Format.outputTypes)
      && !Format.outputTypes.includes(this.output))
    {
      throw new TypeError(
        `${Format.name || "format"} does not declare the output `
        + `${JSON.stringify(this.output)}; it declares `
        + `${Format.outputTypes.map(value => JSON.stringify(value)).join(", ")}.`
      );
    }
    Object.freeze(this);
  }

  /**
   * Whether this route recognises the data.
   *
   * The route's own probe answers when it has one, and it is the only thing
   * that can separate two readers over ONE container. `Format.isSupported` says
   * "yes, this is a Granny file" for both a `.gr2` and a `.gsf`, because it is
   * — the question it answers is about the container, not about which
   * projection applies. `isGsf` is the question that matters there.
   *
   * Falling back to `Format.isSupported` is right when the routes belong to
   * different formats, which is the `.static` case.
   *
   * A route with no probe at all answers yes: the extension already selected
   * it, and a format is entitled to reject its own file later with a better
   * message than a probe could give. A probe that throws has declined rather
   * than failed — probes read headers of files they may not own.
   */
  Accepts(data)
  {
    if (data === undefined) return true;
    const probe = typeof this.accepts === "function"
      ? this.accepts
      : this.accepts
        ? this.Format[this.accepts]
        : this.Format.isSupported;
    if (typeof probe !== "function") return true;
    try { return Boolean(probe.call(this.Format, data)); }
    catch { return false; }
  }

  /**
   * Read data through this route.
   *
   * The registered output is applied as `emit` unless the caller names one,
   * which is what makes "which representation of a DDS do we want" a
   * registration decision rather than something every call site repeats.
   *
   * @param {*} data Source data.
   * @param {object|null} [options] Reader options; `emit` overrides the route's output.
   * @returns {*} Whatever the reader returns.
   */
  Read(data, options = null)
  {
    const values = { ...(options || {}) };
    if (this.output && values.emit === undefined) values.emit = this.output;
    return this.Format[this.read](data, values);
  }
}

/**
 * The link between a resource and the formats that can populate it.
 *
 * WHY THIS EXISTS RATHER THAN A RESOURCE IMPORTING ITS FORMATS. ccpwgl's
 * `Tw2TextureRes` imports its five texture formats directly, and that is a
 * reasonable shape for a bundled application. It is the wrong shape for a
 * library: every format here is an explicitly tree-shakeable subpath, so a
 * consumer that pulls in one texture resource must not thereby drag in DDS,
 * PNG, JPEG, TGA, GIF and WebP. A resource that imports its formats destroys
 * that, quietly and permanently.
 *
 * So nobody imports anybody. The composing application registers the routes it
 * actually wants, and both the manager and a resource loading itself ask the
 * store. That is also what makes "which formats exist" a property of the
 * composed application rather than a list baked into the loader.
 *
 * WHAT THE STORE DOES NOT OWN: which resource class a file becomes. That is
 * `CjsResMan.RegisterExtension`'s Handler, and duplicating it here would make
 * two registries disagree about one question. The store answers how bytes are
 * read; the manager answers what they become.
 *
 * ORDER IS THE CALLER'S. Registration order is retained per extension, because
 * where several routes answer for one suffix the caller's ordering is the
 * routing policy.
 */
export class CjsFormatStore
{
  #byExtension = new Map();

  /**
   * Register a format, by default under every extension it declares.
   *
   * `Format.extensions` is a CONVENIENCE, not the routing authority. It exists
   * so a composition root can register a pile of formats without restating
   * what each one reads, and that is the whole of its job. The caller may name
   * extensions instead, and then the declaration is not consulted at all — a
   * format reading a suffix its author never anticipated is a deployment's
   * business, not the format's.
   *
   * That is also the only way to reach `webgl`, `webgpu` and `dxbc` through a
   * store. They declare nothing because their inputs are logical names rather
   * than file suffixes, which is a statement about what they read, not a bar on
   * an application routing a suffix to one of them.
   *
   * The second argument may be the extensions alone, or a route:
   *
   * ```js
   * store.Register(CjsPngFormat);                                   // as declared
   * store.Register(CjsGr2Format, { extensions: ".gsf", read: "readGsf" });
   * store.Register(CjsDdsFormat, { extensions: ".dds", output: "texture" });
   * ```
   *
   * Registering the same route twice under one extension is a no-op, so a
   * composition root may register defensively. Two routes over the same format
   * that differ in reader or output are NOT duplicates — that is the whole
   * point of naming them.
   *
   * @param {Function} Format Format class.
   * @param {string|string[]|object|null} [options] Extensions, or a route descriptor.
   * @returns {CjsFormatStore} This store.
   */
  Register(Format, options = null)
  {
    if (typeof Format !== "function")
    {
      throw new TypeError("CjsFormatStore.Register requires a format class.");
    }

    const settings = options === null || options === undefined
      ? {}
      : (typeof options === "string" || Array.isArray(options))
        ? { extensions: options }
        : options;

    const supplied = settings.extensions === undefined || settings.extensions === null
      ? null
      : Array.isArray(settings.extensions) ? settings.extensions : [ settings.extensions ];
    const declared = supplied || Format.extensions;
    if (!Array.isArray(declared) || declared.length === 0)
    {
      const name = Format.name || "format";
      const error = new Error(
        `${name} declares no extensions and none were supplied, so there is `
        + "nothing to route it under. Pass the extensions this application "
        + "wants it to read: Register(Format, \".ext\"). Formats whose inputs "
        + "are logical names rather than file suffixes - webgl, webgpu, dxbc - "
        + "declare none, and are usually used directly instead."
      );
      error.code = "CJS_FORMAT_STORE_NO_EXTENSIONS";
      throw error;
    }

    const route = new CjsFormatRoute(Format, settings);
    for (const extension of declared)
    {
      const key = normalizeResourceExtension(extension);
      if (!key)
      {
        // An empty key would register silently and route nothing, which is the
        // worst of both outcomes: the caller believes the format is reachable.
        throw new TypeError(
          `CjsFormatStore.Register cannot route ${Format.name || "a format"} `
          + `under ${JSON.stringify(extension)}, which is not an extension.`
        );
      }
      const existing = this.#byExtension.get(key);
      if (!existing) this.#byExtension.set(key, [ route ]);
      else if (!existing.some(entry => isSameRoute(entry, route))) existing.push(route);
    }
    return this;
  }

  /**
   * Register several formats in caller order.
   *
   * An entry is either a format class, which registers under what it declares,
   * or a `[Format, extensionsOrRoute]` pair.
   *
   * @param {Iterable<Function|[Function, string|string[]|object]>} formats
   * @returns {CjsFormatStore} This store.
   */
  RegisterAll(formats)
  {
    for (const entry of formats || [])
    {
      if (Array.isArray(entry)) this.Register(entry[0], entry[1]);
      else this.Register(entry);
    }
    return this;
  }

  /**
   * Every route registered for an extension, in registration order.
   *
   * @param {string} extension
   * @returns {CjsFormatRoute[]} A copy; the store's own order is not exposed for mutation.
   */
  Get(extension)
  {
    return [ ...(this.#byExtension.get(normalizeResourceExtension(extension)) || []) ];
  }

  /**
   * Whether anything is registered for an extension.
   *
   * @param {string} extension
   * @returns {boolean}
   */
  Has(extension)
  {
    return this.#byExtension.has(normalizeResourceExtension(extension));
  }

  /**
   * The route that should read this data.
   *
   * Three filters apply in order, and each exists because something in this
   * package needs it:
   *
   * 1. **Extension** narrows to the routes registered for the suffix.
   * 2. **Output**, when the caller wants a particular representation, narrows
   *    further. A resource asking for `texture` must not be handed the route
   *    registered to decode the same file to `rgba`. `CjsResource.requirement`
   *    is where that request usually comes from.
   * 3. **Content** separates what remains, because with several candidates left
   *    nothing else can. With exactly one the data is not consulted at all: the
   *    extension already decided, and the format is entitled to reject its own
   *    file with a better message than a probe could produce.
   *
   * Returns `null` rather than guessing when nothing matches, so the caller
   * reports what it could not read instead of handing bytes to a reader that
   * never claimed them.
   *
   * @param {string} extension
   * @param {*} [data] Data to probe when more than one route remains.
   * @param {object|null} [options] May carry `output` to select a representation.
   * @returns {CjsFormatRoute|null} The chosen route.
   */
  Resolve(extension, data, options = null)
  {
    let candidates = this.#byExtension.get(normalizeResourceExtension(extension)) || [];

    const output = options?.output || null;
    if (output)
    {
      candidates = candidates.filter(route => route.output === output
        || (route.output === null && routeDeclaresOutput(route, output)));
      // A requested output nothing was registered for is a miss, not a reason
      // to fall back to a route that produces something else entirely.
      if (candidates.length === 0) return null;
    }

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    if (data === undefined) return candidates[0];

    return candidates.find(route => route.Accepts(data)) || null;
  }

  /** Every extension the store can route, sorted. */
  Extensions()
  {
    return [ ...this.#byExtension.keys() ].sort();
  }

  /** Forget every registration. */
  Clear()
  {
    this.#byExtension.clear();
    return this;
  }
}

/**
 * Whether two routes are the same registration.
 *
 * Same format but a different reader or output is a DIFFERENT route, which is
 * how one format serves `.gr2` and `.gsf`, or serves `.dds` as both a
 * compressed texture and decoded RGBA.
 */
function isSameRoute(left, right)
{
  return left.Format === right.Format
    && left.read === right.read
    && left.output === right.output
    && left.accepts === right.accepts;
}

/** Whether an unpinned route's format can produce the requested output. */
function routeDeclaresOutput(route, output)
{
  const declared = route.Format.outputTypes;
  return Array.isArray(declared) ? declared.includes(output) : false;
}

export { CjsFormatRoute };
export default CjsFormatStore;
