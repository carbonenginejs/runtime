import { meta } from "#schema";


/** Trinity-owned promise-capable child-resource resolution contract. */
@meta.define({ className: "CjsEveChildResourceLoader", family: "eve/child" })
export class CjsEveChildResourceLoader
{

  /** Resolves one child resource path for its owning graph object. */
  @meta.abstract
  LoadChild(_resourcePath, _owner)
  {
    throw new Error("CjsEveChildResourceLoader.LoadChild must be implemented by a concrete loader.");
  }

}
