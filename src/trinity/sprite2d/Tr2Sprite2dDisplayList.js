// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.cpp
// Carbon's nested Tr2Sprite2dDisplayList::Entry is ported in
// Tr2Sprite2dDisplayListEntry.js.
import { meta, blue } from "#schema";
import { Tr2BufferAL } from "#trinityal";
import { Tr2Sprite2dDisplayListEntry } from "./Tr2Sprite2dDisplayListEntry.js";

/** Carbon's captured UI geometry. Device reset callers must explicitly release it;
 * the native Tr2DeviceResource registration base has not been ported yet. */
@meta.carbon("Tr2Sprite2dDisplayList")
export class Tr2Sprite2dDisplayList
{
  vertexBuffer = new Tr2BufferAL();
  indexBuffer = new Tr2BufferAL();
  entries = [];
  _owner = null;

  /** Retains the owner to invalidate when captured resources are released. */
  constructor(owner)
  {
    this._owner = owner;
  }

  /** Native release drops geometry and dirties the owner for recapture. */
  @meta.implemented
  @blue.method
  ReleaseResources(_storage)
  {
    this.vertexBuffer.Destroy();
    this.indexBuffer.Destroy();
    this.entries.length = 0;
    this._owner.SetDirty();
  }

  /**
   * Carbon's private `OnPrepareResources` override of Tr2DeviceResource
   * (Tr2Sprite2dDisplayList.h:55, cpp:116-119). Carbon prepares nothing here
   * and reports success.
   *
   * Stays public although Carbon declares it private: it is a virtual override
   * the base dispatches by name, so a `_` rename would break dispatch; the `_`
   * rule covers private methods that are not overrides.
   *
   * @returns {boolean} Always true, as Carbon returns.
   */
  @meta.implemented
  @blue.method
  OnPrepareResources()
  {
    return true;
  }

  /**
   * Explicit equivalent of the native destructor: JS has no deterministic destruction.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    this.vertexBuffer.Destroy();
    this.indexBuffer.Destroy();
    this.entries.length = 0;
  }

  /** Carbon Tr2Sprite2dDisplayList::Entry (public, Tr2Sprite2dDisplayList.h:23-43). */
  static Entry = Tr2Sprite2dDisplayListEntry;
}
