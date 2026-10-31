import { IRoot } from "./IRoot.js";
// Source: blue/include/ITriObserverLocal.h
import { CjsSchema, meta } from "#schema";

/** Native IRoot-shaped contract for binding a local placement observer. */
export class ITriObserverLocal extends IRoot
{
  /**
   * Gets the bound placement observer. @returns {object|null} Observer.
   *
   * @abstract
   */
  GetObserver()
  {
  }

  /**
   * Binds a placement observer. @param {object|null} _observer Observer. @returns {void}
   *
   * @abstract
   */
  SetObserver(_observer)
  {
  }
}

for (const method of ["GetObserver", "SetObserver"])
{
  CjsSchema.decorateMethod(ITriObserverLocal, method, meta.abstract);
}
CjsSchema.exposure.interface("ITriObserverLocal")(ITriObserverLocal);
