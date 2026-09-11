// Source: trinity/trinityal/Tr2DeviceResourceAL.h
// Source: trinity/trinityal/Tr2DeviceResourceAL.cpp
//
import { impl } from "#schema";

// The base every abstraction-layer resource extends, and the registry that
// makes them enumerable.
//
// Carbon's reason for this base is worth keeping in view: it is how a device
// answers "what am I holding, and how much of it" without every resource type
// inventing its own bookkeeping. `DescribeDeviceResources` walks every live
// resource and asks it to describe itself; `DestroyDeviceResources` releases
// everything in a memory class, which is what a device-lost path needs.
//
// Existing lifetime adaptation: Carbon registers in the constructor and
// unregisters in the destructor (Tr2DeviceResourceAL.cpp:32-44). JavaScript has
// no deterministic destructor. This implementation keeps strong registry
// references and unregisters at explicit Destroy. A resource never destroyed
// stays registered; destroying and recreating the same object does not register
// it again. Restoring the forwarding class does not change that lifetime policy.



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
 * The abstract registry interface is implemented by Tr2DeviceResourceAL's
 * forwarding methods and the concrete backend's Destroy and Describe methods.
 */
export class Tr2BaseDeviceResourceAL
{
  _registered = false;

  /** Registers the resource, as Carbon's constructor does. */
  constructor()
  {
    ALL_RESOURCES.add(this);
    this._registered = true;
    resourcesMutated = true;
  }

  /**
   * Whether this resource still holds anything.
   *
   * @returns {boolean} True when live.
   */
  @impl.adapted
  @impl.reason("JavaScript has no pure virtual declarations; calling the missing obligation throws.")
  IsResourceValid()
  {
    fail(`${this.constructor.name} must implement IsResourceValid`);
  }

  /**
   * Which memory class this resource occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @impl.adapted
  @impl.reason("JavaScript has no pure virtual declarations; calling the missing obligation throws.")
  GetResourceMemoryClass()
  {
    fail(`${this.constructor.name} must implement GetResourceMemoryClass`);
  }

  /**
   * Describes this resource for a device inventory.
   *
   * Carbon fills a `map<string,string>`. Every stub resource leaves it empty
   * EXCEPT `Tr2PipelineStatsQueryAL`, which writes its own type name
   * (`Tr2PipelineStatsQueryALStub.cpp:65-68`) - so an unoverridden description
   * is faithful rather than lazy, and that one override is faithful too.
   *
   * @param {object} _description Accumulator, keyed by name.
   */
  @impl.adapted
  @impl.reason("The empty concrete stub descriptions share this inherited implementation instead of repeating it on each backend class.")
  Describe(_description)
  {
  }

  /**
   * Releases the resource. Subclasses override and call `super.Destroy()`.
   *
   * Unregistering here rather than in a finaliser is what makes the release
   * path deterministic; see the head comment.
   */
  @impl.adapted
  @impl.reason("JavaScript has no deterministic destructor; the existing registry unregisters at explicit Destroy. Recreating that object does not re-register it.")
  Destroy()
  {
    if (!this._registered) return;

    ALL_RESOURCES.delete(this);
    this._registered = false;
    resourcesMutated = true;
  }

  /** Whether this resource is still in the registry. */
  IsRegistered()
  {
    return this._registered;
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
    if (!resource.IsResourceValid()) continue;

    const description = {};

    resource.Describe(description);
    operation(resource.GetResourceMemoryClass(), description);
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
      if (resource.IsResourceValid() && (resource.GetResourceMemoryClass() & memoryTypes) !== 0)
      {
        resource.Destroy();
      }

      if (resourcesMutated) break;
    }
  }
  while (resourcesMutated);
}
