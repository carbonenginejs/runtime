import { IRoot } from "./IRoot.js";
// Source: blue/include/IBlueResource.h:11-31
//
// The contract of a resource Blue loads: an identity (path and extension) and the
// three states of its load. Plain JavaScript so a test can import it raw.
import { CjsSchema, meta } from "#schema";

/**
 * `IBlueResource` - a loadable resource's identity and load state.
 *
 * @abstract
 */
export class IBlueResource extends IRoot
{
  /**
   * `Initialize` - sets the resource identity.
   *
   * @abstract
   * @param {string} name The resource path.
   * @param {string} ext The extension.
   */
  Initialize(name, ext) {}

  /**
   * `GetPath` - the resource path.
   *
   * @abstract
   * @returns {string}
   */
  GetPath() {}

  /**
   * `GetExt` - the resource extension.
   *
   * @abstract
   * @returns {string}
   */
  GetExt() {}

  /**
   * `IsLoading` - true as soon as the load phase is done; prepare may still be pending.
   *
   * @abstract
   * @returns {boolean}
   */
  IsLoading() {}

  /**
   * `IsPrepared` - true as soon as prepare has finished. Errors in either phase show in `IsGood`.
   *
   * @abstract
   * @returns {boolean}
   */
  IsPrepared() {}

  /**
   * `IsGood` - true when the resource loaded and prepared without errors.
   *
   * @abstract
   * @returns {boolean}
   */
  IsGood() {}
}

for (const name of [ "Initialize", "GetPath", "GetExt", "IsLoading", "IsPrepared", "IsGood" ])
{
  CjsSchema.decorateMethod(IBlueResource, name, meta.abstract);
}

CjsSchema.meta.abstract(IBlueResource);
CjsSchema.exposure.interface("IBlueResource")(IBlueResource);
