// Source: trinity/trinityal/stub/Tr2RenderContextStub.h
import { CjsSchema, meta, blue } from "#schema";
//   Declared top-level beside the render context, as every backend declares it.


/**
 * Carbon's `Tr2BindlessResourcesAL` (`Tr2RenderContextStub.h:32-47`).
 *
 * A list of resources handed to `UseResources` so a backend can make them
 * resident together. Every method is empty in the stub, exactly as in Carbon:
 * residency is a device concern and there is no device here.
 *
 * Carbon overloads `Add` for a texture, a buffer and another resource list
 * (h:35-43). JavaScript cannot see which, so each overload is its own method:
 * `Add__TextureAL`, `Add__BufferAL` and `Add__BindlessResourcesAL`.
 */
export class Tr2BindlessResourcesAL
{
  /**
   * Carbon's bare `Add`, for literal ports. No overload is more native than
   * the others and all three take one of our own classes, which JavaScript
   * cannot tell apart without the `instanceof` the port forbids, so this
   * throws and names the specific methods. Engine code calls those.
   *
   * @param {object} _resource The resource to make resident.
   * @throws {TypeError} Always.
   */
  Add(_resource)
  {
    throw new TypeError("Tr2BindlessResourcesAL.Add cannot tell its overloads apart: call Add__TextureAL, Add__BufferAL or Add__BindlessResourcesAL.");
  }

  /**
   * Carbon's `Add( const Tr2TextureAL& )` (Tr2RenderContextStub.h:35-37):
   * empty in the stub.
   *
   * @param {object} _texture A `Tr2TextureAL`.
   */
  Add__TextureAL(_texture)
  {
  }

  /**
   * Carbon's `Add( const Tr2BufferAL& )` (Tr2RenderContextStub.h:38-40):
   * empty in the stub.
   *
   * @param {object} _buffer A `Tr2BufferAL`.
   */
  Add__BufferAL(_buffer)
  {
  }

  /**
   * Carbon's `Add( const Tr2BindlessResourcesAL& )`
   * (Tr2RenderContextStub.h:41-43): adds the contents of another list; empty
   * in the stub.
   *
   * @param {Tr2BindlessResourcesAL} _resources The list whose contents to add.
   */
  Add__BindlessResourcesAL(_resources)
  {
  }

  /** Empties the list. */
  Clear()
  {
  }
}

CjsSchema.decorateMethod(Tr2BindlessResourcesAL, "Add", blue.method, meta.adapted);
CjsSchema.decorateMethod(Tr2BindlessResourcesAL, "Add__TextureAL", blue.method, meta.implemented);
CjsSchema.decorateMethod(Tr2BindlessResourcesAL, "Add__BufferAL", blue.method, meta.implemented);
CjsSchema.decorateMethod(Tr2BindlessResourcesAL, "Add__BindlessResourcesAL", blue.method, meta.implemented);
CjsSchema.decorateMethod(Tr2BindlessResourcesAL, "Clear", blue.method);
CjsSchema.meta.carbon("Tr2BindlessResourcesAL")(Tr2BindlessResourcesAL);
