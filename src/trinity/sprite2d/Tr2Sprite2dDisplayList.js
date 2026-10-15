// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.cpp
// Carbon's nested Tr2Sprite2dDisplayList::Entry is ported in
// Tr2Sprite2dDisplayListEntry.js.
import { meta, blue } from "#schema";
import { Tr2BufferAL } from "#trinityal";

/** Carbon's captured UI geometry. Device reset callers must explicitly release it;
 * the native Tr2DeviceResource registration base has not been ported yet. */
@blue.define("Tr2Sprite2dDisplayList")
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
   * @returns {boolean} Always true, as Carbon returns.
   */
  @meta.implemented
  OnPrepareResources()
  {
    return true;
  }

  /** Explicit equivalent of the native destructor: JS has no deterministic destruction. */
  Destroy()
  {
    this.vertexBuffer.Destroy();
    this.indexBuffer.Destroy();
    this.entries.length = 0;
  }
}
