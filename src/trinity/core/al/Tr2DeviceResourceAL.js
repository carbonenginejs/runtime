// Source: trinity/trinityal/Tr2DeviceResourceAL.h
// Source: trinity/trinityal/Tr2DeviceResourceAL.cpp
//
// The base every abstraction-layer resource extends, and the registry that
// makes them enumerable.
//
// Carbon's reason for this base is worth keeping in view: it is how a device
// answers "what am I holding, and how much of it" without every resource type
// inventing its own bookkeeping. `DescribeDeviceResources` walks every live
// resource and asks it to describe itself; `DestroyDeviceResources` releases
// everything in a memory class, which is what a device-lost path needs.
//
// ONE DELIBERATE DIFFERENCE, AND IT IS FORCED. Carbon registers in the
// constructor and unregisters in the DESTRUCTOR, so a resource leaves the
// registry when it goes out of scope. JavaScript has no destructor, and a
// FinalizationRegistry runs at the garbage collector's convenience - which is
// no use to a "release everything now" path. So `Destroy()` unregisters, and a
// resource that is never destroyed stays registered. That is the same shape
// Carbon has before its destructor runs, and it makes Destroy the single
// deterministic release point rather than a hint.
//
// The registry therefore holds STRONG references on purpose. A WeakRef set
// would let a resource vanish between "enumerate" and "destroy", which is
// exactly the case this exists to handle.


function fail(message)
{
  const error = new Error(`Tr2DeviceResourceAL: ${message}`);
  error.code = "CJS_AL_RESOURCE_INVALID";
  throw error;
}


/** `Tr2ALMemoryType` (`Tr2DeviceResourceAL.h:5-9`). A bit set, not an enum. */
export const Tr2ALMemoryType = Object.freeze({
  /** Created in video memory. */
  AL_MEMORY_VIDEO: 1 << 0,

  /** Created in device-managed memory. */
  AL_MEMORY_MANAGED: 1 << 1
});


/** Every live resource. Strong by design - see the head comment. */
const ALL_RESOURCES = new Set();

/**
 * Carbon's `s_resourcesMutated`.
 *
 * Destroying a resource can create or destroy others, which invalidates an
 * iterator mid-walk. Carbon restarts the sweep whenever that happens rather
 * than trusting the iterator, and so does this.
 */
let resourcesMutated = false;


/**
 * The base of every AL resource.
 *
 * Subclasses supply `IsValid()`, `GetMemoryClass()` and the work of `Destroy()`;
 * Carbon's CRTP `Tr2DeviceResourceAL<T>` forwards the first two, which in
 * JavaScript is just ordinary dispatch.
 */
export class Tr2BaseDeviceResourceAL
{
  #registered = false;

  /** Registers the resource, as Carbon's constructor does. */
  constructor()
  {
    ALL_RESOURCES.add(this);
    this.#registered = true;
    resourcesMutated = true;
  }

  /**
   * Whether this resource still holds anything.
   *
   * @returns {boolean} True when live.
   */
  IsValid()
  {
    fail(`${this.constructor.name} must implement IsValid`);
  }

  /**
   * Which memory class this resource occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes this resource for a device inventory.
   *
   * Carbon fills a `map<string,string>`; every stub leaves it empty, so an
   * unoverridden description is faithful rather than lazy.
   *
   * @param {object} _description Accumulator, keyed by name.
   */
  Describe(_description)
  {
  }

  /**
   * Releases the resource. Subclasses override and call `super.Destroy()`.
   *
   * Unregistering here rather than in a finaliser is what makes the release
   * path deterministic; see the head comment.
   */
  Destroy()
  {
    if (!this.#registered) return;

    ALL_RESOURCES.delete(this);
    this.#registered = false;
    resourcesMutated = true;
  }

  /** Whether this resource is still in the registry. */
  IsRegistered()
  {
    return this.#registered;
  }

  /**
   * Runs an operation over every live resource.
   *
   * @param {Function} operation Called with each resource.
   */
  static EnumerateResources(operation)
  {
    if (typeof operation !== "function") fail("EnumerateResources needs a function");

    // A copy, because Carbon takes a mutex here and an operation that creates
    // or destroys a resource would otherwise mutate the set mid-iteration.
    for (const resource of [ ...ALL_RESOURCES ]) operation(resource);
  }

  /** How many resources are live. Not Carbon's; the registry is otherwise opaque. */
  static GetResourceCount()
  {
    return ALL_RESOURCES.size;
  }
}


/**
 * Describes every VALID resource to the supplied operation.
 *
 * Carbon skips invalid resources rather than describing them
 * (`Tr2DeviceResourceAL.cpp:61`), so a released handle contributes nothing to
 * an inventory.
 *
 * @param {Function} operation Called with `(memoryClass, description)`.
 */
export function DescribeDeviceResources(operation)
{
  if (typeof operation !== "function") fail("DescribeDeviceResources needs a function");

  for (const resource of [ ...ALL_RESOURCES ])
  {
    if (!resource.IsValid()) continue;

    const description = {};

    resource.Describe(description);
    operation(resource.GetMemoryClass(), description);
  }
}

/**
 * Destroys every valid resource in the given memory classes.
 *
 * THE RESTART IS CARBON'S AND IS NOT AN OPTIMISATION TO REMOVE. Destroying a
 * resource can create or destroy others, so Carbon breaks out and starts the
 * sweep again whenever the set changed underneath it
 * (`Tr2DeviceResourceAL.cpp:73-89`). Iterating once would skip resources.
 *
 * @param {number} memoryTypes A bit set of `Tr2ALMemoryType`.
 */
export function DestroyDeviceResources(memoryTypes)
{
  do
  {
    resourcesMutated = false;

    for (const resource of [ ...ALL_RESOURCES ])
    {
      if (resource.IsValid() && (resource.GetMemoryClass() & memoryTypes) !== 0)
      {
        resource.Destroy();
      }

      if (resourcesMutated) break;
    }
  }
  while (resourcesMutated);
}
