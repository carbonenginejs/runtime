// Source: trinity/trinity/Resources/Tr2LightProfileRes.h
import { CjsSchema } from "#schema";
import { CjsResource } from "./CjsResource.js";
import { assertResourcePayloadObject } from "./resourceBoundary.js";
import { ResourceRequirement } from "./ResourceRequirement.js";

/**
 * Runtime-owned light-profile resource.
 *
 * The attached plain payload may be richer than the data retained by the
 * resource or active engine adapter.
 */
export class Tr2LightProfileRes extends CjsResource
{
  // The light-profile array slice this resource occupies, or null before
  // registration. Carbon's DoPrepare acquires it (Tr2LightProfileRes.cpp:
  // 95-99: GetLightProfileArray().AddElement(m_bitmap)), but here the
  // resource layer cannot import trinity, so TRINITY registers the element
  // at first pack (Tr2LightManager.#ProfileSlot) and hands the handle in
  // through RegisterProfileElement. Duck-typed on purpose: this class knows
  // only GetElementIndex/Release, never the array class.
  #element = null;

  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null)
  {
    if (payload === null)
    {
      // Losing the payload releases the slice - Carbon's element handle
      // frees its slot when the resource lets go (Tr2TextureArray.cpp:
      // 233-236); with no destructors the unload path is the release site.
      if (this.#element)
      {
        this.#element.Release();
        this.#element = null;
      }
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("Tr2LightProfileRes", payload);
    super.SetPayload(payload);
    return this;
  }

  /**
   * Accepts the profile array slice handle from the trinity seam.
   *
   * @param {{GetElementIndex: Function, Release: Function}} element
   * @returns {Tr2LightProfileRes} this
   */
  RegisterProfileElement(element)
  {
    if (this.#element && this.#element !== element)
    {
      this.#element.Release();
    }
    this.#element = element ?? null;
    return this;
  }

  /**
   * The texture-array slice this profile occupies, or -1 when unregistered.
   *
   * Carbon returns the raw element index and an INVALID handle reports 0
   * (Tr2TextureArrayElement, cpp:216-219) - indistinguishable from slot 0,
   * with the +1 bias left to consumers. The -1 sentinel here is deliberate
   * (matching the proven ccpwgl port): the consumer maps negative to the
   * biased 0, and an unloaded profile can never alias slot 0.
   *
   * @returns {number} Slice index, or -1.
   */
  GetTextureIndex()
  {
    return this.#element ? this.#element.GetElementIndex() : -1;
  }

  static payload = ResourceRequirement.LIGHT_PROFILE;
}

CjsSchema.define(Tr2LightProfileRes, {
  className: "Tr2LightProfileRes",
  family: "resources"
});
