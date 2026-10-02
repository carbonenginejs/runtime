// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable point transforms are maintained here.
import { meta } from "#schema";
import { Tr2Sprite2dContainerBase } from "./Tr2Sprite2dContainerBase.js";
import { vec2 } from "#math/vec2";

/**
 * Applies authored Sprite2D rotation and scaling around configurable centers.
 * Native GatherSprites, PickPoint and GetTransformationMatrix remain unported;
 * inherited methods do not provide the native transform-aware renderer behavior.
 */
@meta.define({ className: "Tr2Sprite2dTransform", family: "sprite2d" })
export class Tr2Sprite2dTransform extends Tr2Sprite2dContainerBase
{

  /**
   * Rotation pivot in relative sprite coordinates: [0, 0] is top-left and [0.5, 0.5] is center.
   * Native m_rotationCenter (Vector2) [READWRITE, NOTIFY].
   * @type {Float32Array}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.vec2
  rotationCenter = vec2.create();

  /**
   * Rotation angle in radians around rotationCenter.
   * Native m_rotation (float) [READWRITE, NOTIFY].
   * @type {number}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  rotation = 0;

  /**
   * Scaling pivot in relative sprite coordinates, converted using displayWidth and displayHeight.
   * Native m_scalingCenter (Vector2) [READWRITE, NOTIFY].
   * @type {Float32Array}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.vec2
  scalingCenter = vec2.create();

  /**
   * Angle in radians orienting the scaling axes before the final rotation.
   * Native m_scalingRotation (float) [READWRITE, NOTIFY].
   * @type {number}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  scalingRotation = 0;

  /**
   * Horizontal and vertical scale factors; [1, 1] leaves the size unchanged.
   * Native m_scale (Vector2) [READWRITE, NOTIFY].
   * @type {Float32Array}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.vec2
  scale = vec2.fromValues(1, 1);

  /**
   * Transforms one local point using native rounded centers and rotation order.
   * @param {number} x Local horizontal coordinate.
   * @param {number} y Local vertical coordinate.
   * @returns {Float32Array} Newly allocated transformed point.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Applies the native matrix operation order directly to a coordinate pair and returns a new vec2.")
  TransformPoint(x, y)
  {
    const scalingCenterX = Math.floor(this.scalingCenter[0] * this.displayWidth + 0.5);
    const scalingCenterY = Math.floor(this.scalingCenter[1] * this.displayHeight + 0.5);
    const rotationCenterX = Math.floor(this.rotationCenter[0] * this.displayWidth + 0.5);
    const rotationCenterY = Math.floor(this.rotationCenter[1] * this.displayHeight + 0.5);

    let px = Number(x) - scalingCenterX;
    let py = Number(y) - scalingCenterY;
    [px, py] = Tr2Sprite2dTransform._Rotate(px, py, -this.scalingRotation);
    px *= this.scale[0];
    py *= this.scale[1];
    [px, py] = Tr2Sprite2dTransform._Rotate(px, py, this.scalingRotation);
    px += scalingCenterX - rotationCenterX;
    py += scalingCenterY - rotationCenterY;
    [px, py] = Tr2Sprite2dTransform._Rotate(px, py, this.rotation);
    return vec2.fromValues(px + rotationCenterX, py + rotationCenterY);
  }

  /**
   * Rotates one coordinate pair for the portable point adapter.
   * @param {number} x Horizontal coordinate.
   * @param {number} y Vertical coordinate.
   * @param {number} angle Rotation in radians.
   * @returns {number[]} Rotated coordinate pair.
   */
  @meta.ours
  static _Rotate(x, y, angle)
  {
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    return [x * cosine - y * sine, x * sine + y * cosine];
  }

}

// Native exposure adds no local interface and chains to its actual base.
meta.blue.interfaceTable({ interfaces: [], chainTo: Tr2Sprite2dContainerBase })(Tr2Sprite2dTransform);
