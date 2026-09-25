import { blue, IBlueResMan } from "../../npm/dist/global/blue/index.js";
import {
  CjsAudioRes, CjsResource, ResourceRequirement, Tr2EffectRes,
  Tr2GrannyStateRes, Tr2LightProfileRes, TriGeometryRes, TriTextureRes
} from "../../npm/dist/resource/index.js";

// A real manager answers with the class the route asks for, and callers check:
// Tr2Effect refuses anything that is not a Tr2EffectRes. So the stub resolves
// the same way, from the requirement the caller passed.
const RESOURCE_BY_REQUIREMENT = new Map([
  [ ResourceRequirement.SHADER, Tr2EffectRes ],
  [ ResourceRequirement.GEOMETRY, TriGeometryRes ],
  [ ResourceRequirement.TEXTURE, TriTextureRes ],
  [ ResourceRequirement.IMAGE, TriTextureRes ],
  [ ResourceRequirement.LIGHT_PROFILE, Tr2LightProfileRes ],
  [ ResourceRequirement.GRANNY_STATE, Tr2GrannyStateRes ],
  [ ResourceRequirement.AUDIO, CjsAudioRes ]
]);

// WHY THIS EXISTS. `blue.resMan` used to be `CjsResMan.GetGlobal()`, a static
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

  /** One resource per path, of the class the requirement names, as a manager's cache gives you. */
  #resourceFor(path, options)
  {
    let resource = this.resources.get(path);
    if (!resource)
    {
      const Resource = RESOURCE_BY_REQUIREMENT.get(options?.requirement) || CjsResource;
      resource = new Resource();
      resource.Initialize(path, options?.ext ?? null);
      // A test manager has no pipeline behind it, so a caller that asks the
      // resource for its object must not start a real load. Carbon's manager
      // always has one; this one answers nothing rather than throwing about a
      // loader the test never configured.
      resource.SetObjectLoader(() => null);
      this.resources.set(path, resource);
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
   * What this manager already holds with its data, as `CjsResMan.Lookup`
   * answers; `blue.paths.FileExistsLocally` asks it ("already fetched"). A
   * stub loads nothing, so it holds nothing.
   */
  Lookup()
  {
    return null;
  }

  LoadObject(path)
  {
    this.requests.push({ path, load: true });
    if (this.resolve) return this.resolve(path, { load: true });
    return this.#resourceFor(path, null);
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
