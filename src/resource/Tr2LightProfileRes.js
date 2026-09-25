// Source: trinity/trinity/Resources/Tr2LightProfileRes.h
import { CjsSchema } from "#schema";
import { CjsResource } from "#blue";
import { assertResourcePayloadObject } from "./resourceBoundary.js";
import { HostBitmap } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { ResourceRequirement } from "#blue";

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

  /**
   * m_bitmap: the baked profile, a 1024x1 `PIXEL_FORMAT_R16_FLOAT` strip with a
   * full mip chain (Tr2LightProfileRes.cpp:13-15, 198-215). Invalid until loaded.
   */
  bitmap = new HostBitmap();

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
      this.bitmap = new HostBitmap();
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("Tr2LightProfileRes", payload);
    this.bitmap = Tr2LightProfileRes.bitmapFromBake(payload);
    super.SetPayload(payload);
    return this;
  }

  /**
   * Carbon's `m_bitmap`, which it hands to the light-profile array
   * (Tr2LightProfileRes.cpp:95-99).
   *
   * @returns {HostBitmap} The baked profile; invalid until loaded.
   */
  GetBitmap()
  {
    return this.bitmap;
  }

  /**
   * The baked profile as Carbon's bitmap. The IES bake already writes Carbon's
   * bytes - half floats, one mip after another - which is exactly a 1024x1
   * R16_FLOAT HostBitmap's memory, so this is a copy, not a conversion.
   *
   * @param {{width: number, samples: Uint16Array}} bake The IES reader's lightProfile output.
   * @returns {HostBitmap} The bitmap; invalid when the bake has no samples.
   */
  static bitmapFromBake(bake)
  {
    const bitmap = new HostBitmap();

    if (!(bake.samples instanceof Uint16Array)) return bitmap;
    if (!bitmap.Create(bake.width, 1, 0, PixelFormat.PIXEL_FORMAT_R16_FLOAT)) return bitmap;

    const raw = bitmap.GetRawData();
    raw.set(new Uint8Array(bake.samples.buffer, bake.samples.byteOffset, Math.min(bake.samples.byteLength, raw.byteLength)));
    return bitmap;
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
