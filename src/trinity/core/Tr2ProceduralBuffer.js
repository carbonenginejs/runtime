// Source: trinity/trinity/Tr2ProceduralResources.h
// Source: trinity/trinity/Tr2ProceduralResources.cpp
import { carbon, impl } from "#schema";
import { Tr2Renderer } from "./Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { TriDevice } from "./device/TriDevice.js";


/**
 * Carbon's anonymous-namespace `Tr2ProceduralResourceRegistry<Tr2ProceduralBuffer>`
 * (cpp:10-56) and its function-local static instance `GetBuffers`
 * (cpp:58-62): one allocation per name for the process, remade on device
 * prepare while invalid. A module-private object rather than a class, because
 * Carbon's is file-private too. It is a `Tr2DeviceResource` in Carbon, so it
 * registers with the device when first reached.
 */
const s_buffers = {
  /** m_resources (std::map<BlueSharedString, Resource*>) */
  resources: new Map(),

  registered: false,

  /** Carbon GetResource (cpp:14-28): the named entry, made now when a device allows it. */
  GetResource(name, factory)
  {
    if (!this.registered)
    {
      TriDevice.RegisterResource(this);
      this.registered = true;
    }

    const found = this.resources.get(name);
    if (found) return found;

    const resource = { resource: null, factory };
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      resource.resource = resource.factory(Tr2RenderContext_GetMainThreadRenderContext());
    }
    this.resources.set(name, resource);
    return resource;
  },

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32). */
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      if (!this.OnPrepareResources()) return false;
    }
    return true;
  },

  /** Carbon's override is empty (cpp:31-33): the allocations outlive a release. */
  ReleaseResources(_storage)
  {
  },

  /** Carbon OnPrepareResources (cpp:35-46): remake every invalid allocation. */
  OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    for (const resource of this.resources.values())
    {
      if (!resource.resource || !resource.resource.IsValid())
      {
        resource.resource = resource.factory(renderContext);
      }
    }
    return true;
  }
};


/**
 * A named procedural vertex or index allocation shared by every holder of the
 * same name, made once a device exists.
 */
export class Tr2ProceduralBuffer
{
  /** m_resource (h:19): the registry entry every same-named buffer shares. */
  _resource = null;

  /**
   * @param {string} name Registry key (Carbon's BlueSharedString).
   * @param {function(object): (object|null)} factory Makes the allocation
   *   through the given render context.
   */
  constructor(name, factory)
  {
    this._resource = s_buffers.GetResource(name, factory);
  }

  /**
   * The shared allocation. Carbon's factory fills an out parameter and the
   * reference is never null; `Tr2SuballocatedBuffer.Allocate` returns the
   * allocation instead, so this is null until a device has run the factory.
   *
   * @returns {object|null} A `Tr2SuballocatedBufferAllocation`, or null.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's factory fills an out-parameter allocation that is never null; ours returns the allocation, so there is none before a device has run the factory.")
  GetSharedResource()
  {
    return this._resource.resource;
  }
}
