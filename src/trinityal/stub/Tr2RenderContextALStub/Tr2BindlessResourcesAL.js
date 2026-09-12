// Source: trinity/trinityal/stub/Tr2RenderContextStub.h
//   Declared top-level beside the render context, as every backend declares it.


/**
 * Carbon's `Tr2BindlessResourcesAL` (`Tr2RenderContextStub.h:32-47`).
 *
 * A list of resources handed to `UseResources` so a backend can make them
 * resident together. Every method is empty in the stub, exactly as in Carbon:
 * residency is a device concern and there is no device here.
 *
 * Carbon overloads `Add` for a texture, a buffer and another resource list;
 * JavaScript dispatches on one method, which is the ordinary shape of an
 * overload set here and not a divergence in behaviour.
 */
export class Tr2BindlessResourcesAL
{
  /**
   * Adds a texture, a buffer, or the contents of another list.
   *
   * @param {object} _resource The resource to make resident.
   */
  Add(_resource)
  {
  }

  /** Empties the list. */
  Clear()
  {
  }
}
