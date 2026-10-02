// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask.h
//   trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask.cpp
//   trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask_Blue.cpp:29-30 (the
//   maskPath property pair)
// Hand-maintained from Carbon source, promoted out of generated intake
// 2026-09-06.
import { meta } from "#schema";
import { ResourceRequirement } from "#resource";
import { blue } from "#blue";

/** Defines channel, threshold, edge, and texture-mask constraints used when hit-testing a 2D sprite. */
@meta.define({ className: "Tr2Sprite2dPickingMask", family: "sprite2d", purpose: "Defines channel, threshold, edge, and texture-mask constraints used when hit-testing a 2D sprite." })
export class Tr2Sprite2dPickingMask
{

  /** Native path backing storage; the exposed property delegates resource acquisition. @type {string} */
  _maskPath = "";

  /** Native READWRITE wide-string property backed by GetMaskPath. @returns {string} */
  @meta.blue.readwrite
  @meta.type.wstring
  @meta.ours
  get maskPath()
  {
    return this.GetMaskPath();
  }

  /** Delegates property writes to the native path method adapter. @param {string} value Image path. */
  @meta.ours
  set maskPath(value)
  {
    this.SetMaskPath(value);
  }

  /** Native anonymous BGRA channel chooser. @type {number} */
  @meta.blue.readwrite
  @meta.type.enum({ Red: 2, Green: 1, Blue: 0, Alpha: 3 })
  @meta.type.uint32
  channel = 3;

  /** Sampled channel must exceed this native READWRITE threshold. @type {number} */
  @meta.blue.readwrite
  @meta.type.float32
  threshold = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @meta.blue.readwrite
  @meta.type.uint32
  leftEdge = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @meta.blue.readwrite
  @meta.type.uint32
  topEdge = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @meta.blue.readwrite
  @meta.type.uint32
  rightEdge = 0;

  /** Native READWRITE mask edge in pixels. @type {number} */
  @meta.blue.readwrite
  @meta.type.uint32
  bottomEdge = 0;

  /** Native READ held image resource; excluded from value serialization. @type {Tr2ImageRes|null} */
  @meta.blue.read
  @meta.type.resource("Tr2ImageRes")
  mask = null;

  /** Carbon GetMaskPath (Tr2Sprite2dPickingMask.cpp:18-21). @returns {string} */
  @meta.blue.method
  @meta.implemented
  GetMaskPath()
  {
    return this._maskPath;
  }

  /**
   * Carbon SetMaskPath (cpp:23-31): guard the redundant set, clear the mask
   * and refetch it through the process-wide manager (BeResMan's L"raw"
   * image fetch is the IMAGE requirement here, through blue.resMan as
   * Tr2TexturedPointLight does). Empty paths retain the existing no-fetch adapter.
   * @param {string} path Image resource path.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Uses the composed IMAGE resource route, coerces paths to strings and clears empty paths without acquisition.")
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
   * Preserves the existing RGBA byte-array adapter. Actual Tr2ImageRes.GetPixelColor
   * returns a normalized color object, so it currently fails the array guard.
   * Native bitmap sampling and the R8 channel override remain unresolved gaps;
   * byte-array fixtures exercise only the existing portable adapter.
   *
   * @param {Float32Array|number[]} point The test point, in the same space as topLeft.
   * @param {Float32Array|number[]} topLeft The sprite's top-left corner.
   * @param {number} width The sprite's width.
   * @param {number} height The sprite's height.
   * @returns {boolean} Whether the mask passes at the point.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Preserves the RGBA byte-array adapter; normalized Tr2ImageRes color objects and native R8 sampling remain unsupported.")
  SampleMask(point, topLeft, width, height)
  {
    const mask = this.mask;
    if (!mask || !mask.IsGood()) return false;

    const maskWidth = mask.GetWidth();
    const maskHeight = mask.GetHeight();
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

    const pixel = mask.GetPixelColor(px, py);
    if (!Array.isArray(pixel)) return false;

    const channel = Math.min(this.channel, 3);
    const rgbaChannel = channel === 0 ? 2 : channel === 2 ? 0 : channel;
    return pixel[rgbaChannel] / 255 > this.threshold;
  }

}

// Native IRoot exposure maps only the concrete mask interface.
meta.blue.interfaceTable({ interfaces: [Tr2Sprite2dPickingMask], chainTo: null })(Tr2Sprite2dPickingMask);
