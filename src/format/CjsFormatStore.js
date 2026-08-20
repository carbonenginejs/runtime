import { normalizeResourceExtension } from "@carbonenginejs/runtime-utils/path";

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
 * So nobody imports anybody. The composing application registers the formats
 * it actually wants, and both the manager and a resource loading itself ask
 * the store. That is also what makes "which formats exist" a property of the
 * composed application rather than a list baked into the loader.
 *
 * A format is indexed by its own `extensions` declaration. Formats whose
 * inputs are not file suffixes — `webgl`, `webgpu`, `dxbc` — declare none and
 * are simply not reachable this way, which is the honest answer rather than a
 * gap.
 *
 * ORDER IS THE CALLER'S. Registration order is retained per extension, because
 * where two formats answer for one suffix the caller's ordering is the routing
 * policy. `.static` is the live case: three unrelated containers ship under it
 * and only content tells them apart.
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
   * Registering the same format twice under the same extension is a no-op
   * rather than an error, so a composition root may register defensively
   * without tracking what it has already done.
   *
   * @param {Function} Format Format class.
   * @param {string|string[]|null} [extensions] Extensions to route, overriding the declaration.
   * @returns {CjsFormatStore} This store.
   */
  Register(Format, extensions = null)
  {
    if (typeof Format !== "function")
    {
      throw new TypeError("CjsFormatStore.Register requires a format class.");
    }

    const supplied = extensions === null || extensions === undefined
      ? null
      : Array.isArray(extensions) ? extensions : [ extensions ];
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
      if (!existing) this.#byExtension.set(key, [ Format ]);
      else if (!existing.includes(Format)) existing.push(Format);
    }
    return this;
  }

  /**
   * Register several formats in caller order.
   *
   * An entry is either a format class, which registers under what it declares,
   * or a `[Format, extensions]` pair naming where it should route instead.
   *
   * @param {Iterable<Function|[Function, string|string[]]>} formats
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
   * Every format registered for an extension, in registration order.
   *
   * @param {string} extension
   * @returns {Function[]} A copy; the store's own order is not exposed for mutation.
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
   * The single format that should read these bytes.
   *
   * With one candidate the extension already decided, and the bytes are not
   * consulted: a format is entitled to reject its own file later with a better
   * message than this store could produce.
   *
   * With several, content decides, because that is the only thing that can.
   * Each candidate is asked in registration order and the first to recognise
   * the bytes wins. A candidate whose probe throws is treated as declining
   * rather than failing the resolve - probes read headers of files they may
   * not own, and one throwing probe must not mask a later format that would
   * have said yes.
   *
   * Returns `null` rather than guessing when nothing matches, so the caller
   * reports what it could not read instead of handing bytes to a format that
   * never claimed them.
   *
   * @param {string} extension
   * @param {*} [data] Bytes to probe when more than one format is registered.
   * @returns {Function|null} The chosen format class.
   */
  Resolve(extension, data)
  {
    const candidates = this.#byExtension.get(normalizeResourceExtension(extension)) || [];
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    if (data === undefined) return candidates[0];

    for (const Format of candidates)
    {
      try
      {
        if (typeof Format.isSupported === "function" && Format.isSupported(data)) return Format;
      }
      catch
      {
        // A probe that throws has declined, not failed. Keep asking.
      }
    }
    return null;
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

export default CjsFormatStore;
