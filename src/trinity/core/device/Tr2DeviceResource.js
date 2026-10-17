// Source: trinity/trinity/Tr2DeviceResource.h
// Source: trinity/trinity/Tr2DeviceResource.cpp
//
// Carbon's base for objects that own device resources. TriDevice keeps every
// one registered, prepares them when resources may be created and releases
// them before a reset or shutdown.
//
// Carbon notes this is "not a proper Blue interface - it does not inherit
// from IRoot" (h:19-21): a class takes it as one of several C++ bases. In
// JavaScript a class has one base, so the Eve and Trinity classes take it the
// way they take their other secondary bases, through `@blue.inherit`, which
// installs PrepareResources and GetDescription where the class has none.
// That route has no constructor, so such a class registers itself in its own
// constructor (`TriDevice.RegisterResource(this)`) as this constructor does,
// and unregisters in its Destroy, where Carbon's destructor would (cpp:11-14).
import { blue, meta } from "#schema";
import { TriDevice } from "./TriDevice.js";
import { Tr2Renderer } from "../Tr2Renderer.js";

/** Carbon Tr2DeviceResource (Tr2DeviceResource.h:22-62). */
@blue.define("Tr2DeviceResource")
export class Tr2DeviceResource
{

  /** Carbon's constructor (cpp:6-9): registers with the device. */
  constructor()
  {
    TriDevice.RegisterResource(this);
  }

  /**
   * Carbon GetDescription (h:28-33, TRINITYDEV): the resource's description
   * for device diagnostics.
   *
   * Adapted: returned rather than written to an output string, as the other
   * resource descriptions are (TriDebugResourceHelper.GetDescription).
   * @returns {string} "<Unknown>" unless a resource says otherwise.
   */
  @blue.method
  @meta.adapted
  GetDescription()
  {
    return "<Unknown>";
  }

  /**
   * Carbon ReleaseResources (h:40-45): the device asks the resource to drop
   * what the storage flags name - TRISTORAGE_ALL before the device itself is
   * released, TRISTORAGE_VIDEOMEMORY before a reset.
   * @param {number} _s TriStorageFlags.
   */
  @blue.abstract
  ReleaseResources(_s)
  {
  }

  /**
   * Carbon PrepareResources (cpp:16-27): creates the resource's device
   * objects through OnPrepareResources, but only while resource creation is
   * allowed - nothing is created in the middle of an attempted reset, and
   * that counts as success.
   * @returns {boolean} False when OnPrepareResources fails.
   */
  @blue.method
  @meta.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      if (!this.OnPrepareResources())
      {
        return false;
      }
    }
    return true;
  }

  /**
   * Carbon OnPrepareResources (h:47-62): creates only the device objects that
   * are missing, since a release may have dropped only some of them. Called
   * from PrepareResources, never directly.
   * @returns {boolean} Whether preparation succeeded.
   */
  @blue.abstract
  OnPrepareResources()
  {
  }
}
