import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask.h
//   trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask.cpp
//   trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask_Blue.cpp:29-30 (the
//   maskPath property pair)
// Hand-maintained from Carbon source, promoted out of generated intake
// 2026-09-06.
import { meta, type, blue as legacyBlue } from "#schema";
import { ResourceRequirement } from "#resource";
import { blue } from "#blue";
import { PixelFormat } from "#consts/render-context";

/** Defines channel, threshold, edge, and texture-mask constraints used when hit-testing a 2D sprite. */
@legacyBlue.define({ className: "Tr2Sprite2dPickingMask", purpose: "Defines channel, threshold, edge, and texture-mask constraints used when hit-testing a 2D sprite." })
@legacyBlue.interface()
@legacyBlue.inherit(IRoot)
export class Tr2Sprite2dPickingMask extends IRoot
{

  /** Native path backing storage; the exposed property delegates resource acquisition. @type {string} */
  _maskPath = "";

  /** Carbon MAP_PROPERTY "maskPath" (Tr2Sprite2dPickingMask_Blue.cpp:27-33), read through GetMaskPath. @returns {string} */
  @be.mapProperty()
  @type.wstring
  @meta.implemented
  get maskPath()
  {
    return this.GetMaskPath();
  }

  /** Carbon MAP_PROPERTY "maskPath" setter, written through SetMaskPath. @param {string} value Image path. */
  @meta.implemented
  set maskPath(value)
  {
    this.SetMaskPath(value);
  }

  /** Native anonymous BGRA channel chooser. @type {number} */
  @legacyBlue.readwrite
  @type.enum({ Red: 2, Green: 1, Blue: 0, Alpha: 3 })
  @type.uint32
  channel = 3;

  /** Sampled channel must exceed this native READWRITE threshold. @type {number} */
  @be.mapAttribute(be.READWRITE)
  @type.float32
  threshold = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @be.mapAttribute(be.READWRITE)
  @type.uint32
  leftEdge = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @be.mapAttribute(be.READWRITE)
  @type.uint32
  topEdge = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @be.mapAttribute(be.READWRITE)
  @type.uint32
  rightEdge = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @be.mapAttribute(be.READWRITE)
  @type.uint32
  bottomEdge = 0;

  /** Native READ held image resource; excluded from value serialization. @type {Tr2ImageRes|null} */
  @be.mapAttribute(be.READ)
  @type.resource("Tr2ImageRes")
  mask = null;

  /** Carbon GetMaskPath (Tr2Sprite2dPickingMask.cpp:18-21). @returns {string} */

  @meta.implemented
  GetMaskPath()
  {
    return this._maskPath;
  }

  /**
   * Carbon SetMaskPath (cpp:23-31): guard the redundant set, clear the mask
   * and refetch it through the process-wide manager (BeResMan's L"raw"
   * image fetch is the IMAGE requirement here, through be.resMan as
   * Tr2TexturedPointLight does). Empty paths retain the existing no-fetch adapter.
   *
   * Adapted: Uses the composed IMAGE resource route, coerces paths to strings and clears
   * empty paths without acquisition.
   *
   * @param {string} path Image resource path.
   * @returns {void}
   */

  @meta.adapted
  SetMaskPath(path)
  {
    if (this._maskPath === path) return;
    this._maskPath = String(path ?? "");
    this.mask = null;
    if (!this._maskPath) return;
    this.mask = blue.resMan.GetResource(this._maskPath, {
      requirement: ResourceRequirement.IMAGE
    });
  }

  /**
   * Carbon SampleMask (cpp:33-107), the class's algorithm: 9-slice-aware
   * inverse mapping of a point in the sprite's rectangle into the mask
   * bitmap, then a threshold test on the chosen channel. Per axis the
   * leading edge maps 1:1, the trailing edge maps 1:1 from the far side,
   * and the centre stretches proportionally, guarding the degenerate case
   * where the edges consume the whole bitmap.
   *
   * The pixel comes from the mask's bitmap (`m_mask->GetBitmap().GetPixel`,
   * cpp:39, 97-101) as four 0..1 floats in r, g, b, a order
   * (imageio HostBitmap.cpp:1350-1353), and `channel` indexes that array
   * directly; an R8_UNORM bitmap forces index 2 (cpp:102-107).
   *
   * Carbon quirk CE-136, Tr2Sprite2dPickingMask.cpp:97-107 against
   * Tr2Sprite2dPickingMask_Blue.cpp:12-18: the chooser labels 0 "Blue" and
   * 2 "Red" (BGRA byte order), but the array is r, g, b, a, so "Blue" samples
   * red and "Red" samples blue; alpha (the default, 3) and green agree.
   * Reproduced.
   *
   * Carbon quirk CE-137, same lines with imageio HostBitmap.cpp:1314-1318, 1332-1333:
   * Carbon's GetPixel rejects R8 before its R8 case, so an R8 mask never
   * picks; and were it accepted, the R8 value lands in r (index 0,
   * ImageUtility.cpp:37-40) while the override reads index 2 (b, always 0),
   * so it still never picks. Our HostBitmap.GetPixel accepts R8 (its own
   * marked divergence), and the override is reproduced as written, so the
   * outcome matches Carbon: an R8 mask never passes a threshold of 0 or more.
   *
   * @param {Float32Array|number[]} point The test point, in the same space as topLeft.
   * @param {Float32Array|number[]} topLeft The sprite's top-left corner.
   * @param {number} width The sprite's width.
   * @param {number} height The sprite's height.
   * @returns {boolean} Whether the mask passes at the point.
   */

  @meta.implemented
  SampleMask(point, topLeft, width, height)
  {
    const mask = this.mask;
    if (!mask || !mask.IsGood()) return false;

    const bitmap = mask.GetBitmap();
    const maskWidth = bitmap.GetWidth();
    const maskHeight = bitmap.GetHeight();
    if (maskWidth < this.leftEdge + this.rightEdge) return false;
    if (maskHeight < this.topEdge + this.bottomEdge) return false;

    const x = Math.max(0, Math.min(width, point[0] - 0.5 - topLeft[0]));
    const y = Math.max(0, Math.min(height, point[1] - 0.5 - topLeft[1]));

    let px;
    if (x < this.leftEdge)
    {
      px = Math.trunc(x);
    }
    else if (x >= width - this.rightEdge)
    {
      px = Math.min(maskWidth - Math.trunc(width - x), maskWidth - 1);
    }
    else if (maskWidth === this.leftEdge + this.rightEdge)
    {
      px = this.leftEdge;
    }
    else
    {
      px = Math.min(
        Math.trunc((x - this.leftEdge) / (width - this.leftEdge - this.rightEdge)
          * (maskWidth - this.leftEdge - this.rightEdge) + this.leftEdge),
        maskWidth - 1);
    }

    let py;
    if (y < this.topEdge)
    {
      py = Math.trunc(y);
    }
    else if (y >= height - this.bottomEdge)
    {
      py = Math.min(maskHeight - Math.trunc(height - y), maskHeight - 1);
    }
    else if (maskHeight === this.topEdge + this.bottomEdge)
    {
      py = this.topEdge;
    }
    else
    {
      py = Math.min(
        Math.trunc((y - this.topEdge) / (height - this.topEdge - this.bottomEdge)
          * (maskHeight - this.topEdge - this.bottomEdge) + this.topEdge),
        maskHeight - 1);
    }

    // HostBitmap.GetPixel answers null where Carbon's returns false.
    const pixel = bitmap.GetPixel(px, py);
    if (!pixel) return false;

    const channels = [ pixel.r, pixel.g, pixel.b, pixel.a ];
    let channel = Math.min(this.channel, 3);
    if (bitmap.GetFormat() === PixelFormat.PIXEL_FORMAT_R8_UNORM) channel = 2;

    return channels[channel] > this.threshold;
  }

}

// Native IRoot exposure maps only the concrete mask interface.
