import { CjsAudioRes } from "../../npm/dist/audio/resources/index.js";
import { blue, IBlueResMan } from "../../npm/dist/global/blue/index.js";
import { getResourceExtension, normalizeResourcePath } from "../../npm/dist/global/utils/path.js";
import { CjsResource, Tr2ImageRes, Tr2GrannyStateRes, Tr2LightProfileRes, TriGeometryRes, TriGrannyRes, TriTextureRes } from "../../npm/dist/resource/index.js";
import { Tr2EffectRes, ShaderResourceExtensions } from "../../npm/dist/trinity/shader/index.js";

// Carbon: GetResourceHelper (blue/src/BlueResMan.cpp:249-278).
// The source extension plus request suffix selects the class. Unknown keys
// have no factory; the stub must not hide missing registrations with a base res.
const RESOURCE_BY_EXTENSION = new Map([
  ...["dds", "png", "sdd", "tga", "jpg", "jpeg", "bmp", "ecs", "ctr", "vta", "gif"].map(key => [key, TriTextureRes]),
  ...ShaderResourceExtensions.map(key => [key, Tr2EffectRes]),
  [ "gr2", TriGeometryRes ],
  [ "cmf", TriGeometryRes ],
  [ "pngraw", Tr2ImageRes ],
  [ "ddsraw", Tr2ImageRes ],
  [ "sddraw", Tr2ImageRes ],
  [ "tgaraw", Tr2ImageRes ],
  [ "ddslp", Tr2LightProfileRes ],
  [ "ieslp", Tr2LightProfileRes ],
  [ "gr2raw", TriGrannyRes ],
  [ "cmfraw", TriGrannyRes ],
  [ "gsfraw", Tr2GrannyStateRes ],
  [ "wem", CjsAudioRes ],
  [ "ogg", CjsAudioRes ],
  [ "wav", CjsAudioRes ]
]);

// WHY THIS EXISTS. `be.resMan` used to be `CjsBlueResMan.GetGlobal()`, a static
// slot nothing in `src` ever filled - so every consumer received null and
// skipped its acquisition in silence. A test that built a mesh with a res path
// and asserted the geometry was null was asserting that the port was broken.
//
// The slot now starts as `IBlueResMan`, whose verbs throw, so "nobody composed
// a manager" is an error rather than a quiet no-op. A headless test composes
// this instead: a manager that is genuinely installed and genuinely answers,
// rather than one that is absent.
//
// Its GetResource answers with a real CjsResource in its EMPTY state, because
// that is what Carbon's manager does: it hands back the resource for a path,
// creating one when the cache has none, and loading fills it in later. Callers
// are written for that - they attach to its completion - so a manager that
// answered null would be a manager no caller could use. Pass a resolver to
// answer with something else.

/** A composed manager that answers, for a test with no real resource pipeline. */
export class StubResMan extends IBlueResMan
{
  constructor(resolve = null)
  {
    super();
    this.resolve = resolve;
    this.requests = [];
    this.resources = new Map();
  }

  /** One resource per path and suffix, selected by the registered factory key. */
  #resourceFor(path, options)
  {
    const ex = options?.ex ?? "";
    const normalizedPath = normalizeResourcePath(path);
    const key = ex ? `${normalizedPath}\0${ex}` : normalizedPath;
    let resource = this.resources.get(key);
    if (!resource)
    {
      const extension = getResourceExtension(normalizedPath);
      const dynamicTexture = /^dynamic:\/(?:color|texturearray|texturepack)\//u.test(normalizedPath);
      const Resource = dynamicTexture && !ex ? TriTextureRes : RESOURCE_BY_EXTENSION.get((extension + ex).toLowerCase());
      if (!Resource) return null;
      resource = new Resource();
      resource.Initialize(normalizedPath, ex);
      // A test manager has no pipeline behind it, so a caller that asks the
      // resource for its object must not start a real load. Carbon's manager
      // always has one; this one answers nothing rather than throwing about a
      // loader the test never configured.
      resource.SetObjectLoader(() => null);
      this.resources.set(key, resource);
    }
    return resource;
  }

  GetResource(path, options)
  {
    this.requests.push({ path, options });
    if (this.resolve) return this.resolve(path, options);
    return this.#resourceFor(path, options);
  }

  /**
   * What this manager already holds with its data, as `CjsBlueResMan.Lookup`
   * answers. A stub loads nothing, so it holds nothing.
   */
  Lookup()
  {
    return null;
  }

  LoadObject(path)
  {
    this.requests.push({ path, load: true });
    if (this.resolve) return this.resolve(path, { load: true });
    // Preserve the stub's object-loading fixture independently of the factory
    // table: LoadObject callers can supply their graph through the resolver.
    let resource = this.resources.get(path);
    if (!resource)
    {
      resource = new CjsResource();
      resource.Initialize(path);
      resource.SetObjectLoader(() => null);
      this.resources.set(path, resource);
    }
    return resource;
  }
}

/**
 * Installs a stub manager for the duration of a test file.
 *
 * Returns the stub, so a test can read what was asked of it, and a restore
 * function for anything that needs the uncomposed state back.
 */
export function composeStubResMan(resolve = null)
{
  const previous = blue.resMan;
  const stub = new StubResMan(resolve);
  blue.resMan = stub;
  stub.restore = () => { blue.resMan = previous; };
  return stub;
}
