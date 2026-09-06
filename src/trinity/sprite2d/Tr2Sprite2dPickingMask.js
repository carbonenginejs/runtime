// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask.h
//   trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask.cpp
//   trinity/trinity/Sprite2d/Tr2Sprite2dPickingMask_Blue.cpp:29-30 (the
//   maskPath property pair)
// Hand-maintained from Carbon source, promoted out of generated intake
// 2026-09-06 (docs/research/ratchet-three-method-tier-2026-09-06.md).
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { CjsResMan, ResourceRequirement } from "#resource";

/** Defines channel, threshold, edge, and texture-mask constraints used when hit-testing a 2D sprite. */
@type.define({ className: "Tr2Sprite2dPickingMask", family: "sprite2d", purpose: "Defines channel, threshold, edge, and texture-mask constraints used when hit-testing a 2D sprite." })
export class Tr2Sprite2dPickingMask extends CjsModel
{

  /** m_channel (uint32_t) [READWRITE, ENUM] - Carbon's BGRA chooser: 0=B, 2=R, 3=A. */
  @io.readwrite
  @type.uint32
  channel = 3;

  /** m_threshold (float) [READWRITE] - the sampled channel must EXCEED it, 0..1. */
  @io.readwrite
  @type.float32
  threshold = 0;

  /** m_mask (Tr2ImageResPtr) [READ] */
  @io.read
  @type.objectRef("Tr2ImageRes")
  mask = null;

  /** m_maskPath (std::wstring), the Blue property pair's backing string. */
  @io.readwrite
  @type.string
  maskPath = "";

  /** m_bottomEdge (uint32_t) [READWRITE] */
  @io.readwrite
  @type.uint32
  bottomEdge = 0;

  /** m_leftEdge (uint32_t) [READWRITE] */
  @io.readwrite
  @type.uint32
  leftEdge = 0;

  /** m_rightEdge (uint32_t) [READWRITE] */
  @io.readwrite
  @type.uint32
  rightEdge = 0;

  /** m_topEdge (uint32_t) [READWRITE] */
  @io.readwrite
  @type.uint32
  topEdge = 0;

  /** Carbon GetMaskPath (Tr2Sprite2dPickingMask.cpp:18-21). */
  @carbon.method
  @impl.implemented
  GetMaskPath()
  {
    return this.maskPath;
  }

  /**
   * Carbon SetMaskPath (cpp:23-31): guard the redundant set, clear the mask
   * and refetch it through the process-wide manager (BeResMan's L"raw"
   * image fetch is the IMAGE requirement here, the CjsResMan.GetGlobal
   * pattern Tr2TexturedPointLight established); with no manager installed a
   * hand-composing caller assigns `mask` itself.
   */
  @carbon.method
  @impl.implemented
  SetMaskPath(path)
  {
    if (this.maskPath === path) return;
    this.maskPath = String(path ?? "");
    this.mask = null;
    const resourceManager = CjsResMan.GetGlobal();
    if (!resourceManager || !this.maskPath) return;
    this.mask = resourceManager.GetResource(this.maskPath, {
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
   * Carbon samples float channels from a BGRA host bitmap; the canonical
   * payload is RGBA bytes, so the channel index translates through the
   * same B/R swap the pack step's chooser uses and bytes normalise by 255
   * before the threshold compare. Carbon's R8 clause forces channel 2 (the
   * R byte in BGRA) because an R8 host bitmap keeps its value there; an R8
   * source decodes into the canonical payload's red, which is where the
   * translated index already lands.
   *
   * @param {Float32Array|number[]} point The test point, in the same space as topLeft.
   * @param {Float32Array|number[]} topLeft The sprite's top-left corner.
   * @param {number} width The sprite's width.
   * @param {number} height The sprite's height.
   * @returns {boolean} Whether the mask passes at the point.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads float channels from a BGRA host bitmap; the canonical RGBA byte payload translates the channel index and normalises by 255.")
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
