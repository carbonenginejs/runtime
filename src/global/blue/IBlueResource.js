import { IRoot } from "./IRoot.js";
// Source: blue/include/IBlueResource.h:11-31
//
// The contract of a resource Blue loads: an identity (path and extension) and the
// three states of its load. Plain JavaScript so a test can import it raw.
import { CjsSchema, meta } from "#schema";

/** `IBlueResource` - a loadable resource's identity and load state. */
export class IBlueResource extends IRoot
{
  /**
   * `Initialize` - sets the resource identity.
   *
   * @param {string} name The resource path.
   * @param {string} ext The extension.
   */
  Initialize(name, ext) {}

  /**
   * `GetPath` - the resource path.
   *
   * @returns {string}
   */
  GetPath() {}

  /**
   * `GetExt` - the resource extension.
   *
   * @returns {string}
   */
  GetExt() {}

  /**
   * `IsLoading` - true as soon as the load phase is done; prepare may still be pending.
   *
   * @returns {boolean}
   */
  IsLoading() {}

  /**
   * `IsPrepared` - true as soon as prepare has finished. Errors in either phase show in `IsGood`.
   *
   * @returns {boolean}
   */
  IsPrepared() {}

  /**
   * `IsGood` - true when the resource loaded and prepared without errors.
   *
   * @returns {boolean}
   */
  IsGood() {}
}

for (const name of [ "Initialize", "GetPath", "GetExt", "IsLoading", "IsPrepared", "IsGood" ])
{
  CjsSchema.decorateMethod(IBlueResource, name, meta.abstract, meta.implemented);
}

CjsSchema.meta.abstract(IBlueResource);
CjsSchema.meta.implemented(IBlueResource);
CjsSchema.exposure.interface("IBlueResource")(IBlueResource);
