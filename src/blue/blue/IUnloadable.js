import { IRoot } from "../blueexposure/IRoot.js";
// Source: blue/include/IUnloadable.h:7-11
//
// An object that can give up its heavy state while something still holds it,
// and take it back on next use. BlueObjectProxy casts for it before dropping
// an unused object (BlueObjectProxy.cpp:84-96) and calls ReloadWhenReferenced
// on next access (:46-55).
import { CjsSchema, meta } from "#schema";

/** `IUnloadable` - releases and restores an object's state in place. */
export class IUnloadable extends IRoot
{
  /**
   * `UnloadWhenUnreferenced` - release state; the object stays held.
   *
   * @abstract
   * @returns {void}
   */
  UnloadWhenUnreferenced() {}

  /**
   * `ReloadWhenReferenced` - restore the state released by UnloadWhenUnreferenced.
   *
   * @abstract
   * @returns {void}
   */
  ReloadWhenReferenced() {}
}

CjsSchema.decorateMethod(IUnloadable, "UnloadWhenUnreferenced", meta.abstract);
CjsSchema.decorateMethod(IUnloadable, "ReloadWhenReferenced", meta.abstract);

CjsSchema.exposure.interface("IUnloadable")(IUnloadable);
