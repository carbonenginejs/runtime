import { impl, type } from "#schema";


/** Trinity-owned synchronous child-resource resolution contract. */
@type.define({ className: "CjsEveChildResourceLoader", family: "eve/child" })
export class CjsEveChildResourceLoader
{

  /** Resolves one child resource path for its owning graph object. */
  @impl.abstract
  LoadChild(_resourcePath, _owner)
  {
    throw new Error("CjsEveChildResourceLoader.LoadChild must be implemented by a concrete loader.");
  }

}
