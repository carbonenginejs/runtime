// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTransform_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable point transforms are maintained here.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2Sprite2dContainerBase } from "./Tr2Sprite2dContainerBase.js";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";

/** Applies authored Sprite2D rotation and scaling around configurable centers. */
@type.define({ className: "Tr2Sprite2dTransform", family: "sprite2d" })
export class Tr2Sprite2dTransform extends Tr2Sprite2dContainerBase
{

  /** m_rotationCenter (Vector2) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.vec2
  rotationCenter = vec2.create();

  /** m_scalingCenter (Vector2) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.vec2
  scalingCenter = vec2.create();

  /** m_rotation (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  rotation = 0;

  /** m_scale (Vector2) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.vec2
  scale = vec2.fromValues(1, 1);

  /** m_scalingRotation (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  scalingRotation = 0;

  /** Carbon method TransformPoint (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  TransformPoint(x, y)
  {
    const scalingCenterX = Math.floor(this.scalingCenter[0] * this.displayWidth + 0.5);
    const scalingCenterY = Math.floor(this.scalingCenter[1] * this.displayHeight + 0.5);
    const rotationCenterX = Math.floor(this.rotationCenter[0] * this.displayWidth + 0.5);
    const rotationCenterY = Math.floor(this.rotationCenter[1] * this.displayHeight + 0.5);

    let px = Number(x) - scalingCenterX;
    let py = Number(y) - scalingCenterY;
    [px, py] = Tr2Sprite2dTransform.#Rotate(px, py, -this.scalingRotation);
    px *= this.scale[0];
    py *= this.scale[1];
    [px, py] = Tr2Sprite2dTransform.#Rotate(px, py, this.scalingRotation);
    px += scalingCenterX - rotationCenterX;
    py += scalingCenterY - rotationCenterY;
    [px, py] = Tr2Sprite2dTransform.#Rotate(px, py, this.rotation);
    return vec2.fromValues(px + rotationCenterX, py + rotationCenterY);
  }

  /** Rotates one 2D coordinate pair by an angle in radians. */
  static #Rotate(x, y, angle)
  {
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    return [x * cosine - y * sine, x * sine + y * cosine];
  }

}
