// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable point transforms are maintained here.
import { meta } from "#schema";
import { Tr2Sprite2dContainerBase } from "./Tr2Sprite2dContainerBase.js";
import { vec2 } from "#math/vec2";
import { mat4 } from "#math/mat4";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";

/**
 * Applies authored Sprite2D rotation and scaling around configurable centers.
 * Traverses and picks children using Carbon's distinct bounds and content transforms.
 */
@meta.define({ className: "Tr2Sprite2dTransform", family: "sprite2d" })
@meta.blue.chainTo(Tr2Sprite2dContainerBase)
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

  /** Gathers backgrounds then children in reverse order under the local transform and opacity. */
  @meta.blue.method
  @meta.implemented
  GatherSprites(renderer)
  {
    if (!this.display) return;

    renderer.PushTransform(this._GetTransformationMatrix());
    const oldOpacity = renderer.GetAccumulatedAlpha();
    renderer.SetAccumulatedAlpha(this.opacity * oldOpacity);

    for (let index = this.background.length - 1; index >= 0; index--)
    {
      this.background[index].GatherSprites(renderer);
    }

    for (let index = this.children.length - 1; index >= 0; index--)
    {
      this.children[index].GatherSprites(renderer);
    }

    renderer.SetAccumulatedAlpha(oldOpacity);
    renderer.PopTransform();
  }

  /** Picks translated bounds first, then transformed children in front-to-back order. */
  @meta.blue.method
  @meta.implemented
  PickPoint(x, y, renderer)
  {
    if (!this.display || this.pickState === Tr2SpriteObjectPickState.TR2_SPS_OFF) return null;

    renderer.PushTranslation([this.displayX, this.displayY]);
    let isInside = renderer.IsInside([x, y], [0, 0], this.displayWidth, this.displayHeight, 0);
    if (isInside && this.pickingMask)
    {
      isInside = this.pickingMask.SampleMask(renderer.InverseTransformPoint([x, y]), [0, 0], this.displayWidth, this.displayHeight);
    }
    renderer.PopTranslation();

    if (!isInside) return null;

    let object = null;
    renderer.PushTransform(this._GetTransformationMatrix());

    for (const child of this.children)
    {
      object = child.PickPoint(x, y, renderer);
      if (object) break;
    }

    if (this.pickState === Tr2SpriteObjectPickState.TR2_SPS_ON)
    {
      this.auxMouseover = null;
      if (!object)
      {
        object = this;
      }
      else if (object.IsAuxMouseover())
      {
        this.auxMouseover = object;
        object = this;
      }
    }

    renderer.PopTransform();
    return object;
  }

  /**
   * Returns Carbon's pixel-rounded pivot transform, including display translation.
   * Adapted: Expands Transformation2DMatrix into column-vector coefficients;
   * this preserves its scale-axis rotation, scale, final rotation and translation order.
   * @returns {Float32Array} Owned 4x4 local transform.
   */
  @meta.adapted
  _GetTransformationMatrix()
  {
    const sx = Math.floor(this.scalingCenter[0] * this.displayWidth + 0.5);
    const sy = Math.floor(this.scalingCenter[1] * this.displayHeight + 0.5);
    const rx = Math.floor(this.rotationCenter[0] * this.displayWidth + 0.5);
    const ry = Math.floor(this.rotationCenter[1] * this.displayHeight + 0.5);
    const c = Math.cos(this.scalingRotation), s = Math.sin(this.scalingRotation);
    const a = this.scale[0] * c * c + this.scale[1] * s * s;
    const b = (this.scale[0] - this.scale[1]) * c * s;
    const d = this.scale[0] * s * s + this.scale[1] * c * c;
    const cr = Math.cos(this.rotation), sr = Math.sin(this.rotation);
    const tx = sx - rx - a * sx - b * sy;
    const ty = sy - ry - b * sx - d * sy;
    const result = mat4.create(); // alloc: native value return belongs to the caller
    result[0] = cr * a - sr * b;
    result[1] = sr * a + cr * b;
    result[4] = cr * b - sr * d;
    result[5] = sr * b + cr * d;
    result[12] = cr * tx - sr * ty + rx + this.displayX;
    result[13] = sr * tx + cr * ty + ry + this.displayY;
    return result;
  }

  /**
   * Transforms one local point using native rounded centers and rotation order.
   *
   * Adapted: Applies the native matrix operation order directly to a coordinate pair and
   * returns a new vec2.
   *
   * @param {number} x Local horizontal coordinate.
   * @param {number} y Local vertical coordinate.
   * @returns {Float32Array} Newly allocated transformed point.
   */
  @meta.blue.method
  @meta.adapted
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
