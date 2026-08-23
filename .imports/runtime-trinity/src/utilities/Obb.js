// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Utilities/Obb.h
// Source: trinity/trinity/Utilities/Obb.cpp
// Promoted to hand-maintained source 2026-08-22; this is portable CPU geometry.
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { PlaneDotCoord, PlaneDotNormal } from "../core/view/TriFrustum.js";


const LARGE_MOVEMENT = 9e29;

const SIDE_POINTS = [
  [0, 2, 4, 6],
  [1, 3, 5, 7],
  [0, 1, 4, 5],
  [2, 3, 6, 7],
  [0, 1, 3, 4],
  [4, 5, 6, 7]
];

const POINT_SIGNS = [
  [1, 1, 1],
  [-1, 1, 1],
  [1, -1, 1],
  [-1, -1, 1],
  [1, 1, -1],
  [-1, 1, -1],
  [1, -1, -1],
  [-1, -1, -1]
];

/** A portable oriented bounding box with Carbon-compatible clipping helpers. */
@type.define({ className: "Obb", family: "utilities" })
export class Obb extends CjsModel
{

  /** Builds the world-space box and optionally shrinks it against six frustum planes. */
  @carbon.method
  @impl.implemented
  CreateClippedWorldBoundingObb(localMin, localMax, localToWorld, frustum = null)
  {
    vec3.add(this.center, localMax, localMin);
    vec3.scale(this.center, this.center, 0.5);
    vec3.transformMat4(this.center, this.center, localToWorld);

    vec3.subtract(this.sizes, localMax, localMin);
    vec3.scale(this.sizes, this.sizes, 0.5);
    vec3.set(this.x, localToWorld[0], localToWorld[1], localToWorld[2]);
    vec3.set(this.y, localToWorld[4], localToWorld[5], localToWorld[6]);
    vec3.set(this.z, localToWorld[8], localToWorld[9], localToWorld[10]);

    if (!frustum)
    {
      return;
    }

    const point = vec3.create();
    const rayDirection = vec3.create();
    const axes = [this.x, this.y, this.z];

    for (let side = 0; side < 6; side++)
    {
      const axisIndex = Math.floor(side / 2);
      vec3.copy(rayDirection, axes[axisIndex]);
      if (side & 1)
      {
        vec3.negate(rayDirection, rayDirection);
      }

      let movement = LARGE_MOVEMENT;
      for (let frustumSide = 0; frustumSide < 6; frustumSide++)
      {
        const plane = frustum.planes[frustumSide];
        let planeMovement = LARGE_MOVEMENT;
        let pointInside = false;

        for (let index = 0; index < 4 && !pointInside; index++)
        {
          this.#WriteMaskedPoint(point, SIDE_POINTS[side][index]);
          const distance = PlaneDotCoord(plane, point);
          if (distance >= 0)
          {
            pointInside = true;
            continue;
          }

          const normalDistance = PlaneDotNormal(plane, rayDirection);
          if (normalDistance < 0.0001)
          {
            continue;
          }

          const amount = -distance / normalDistance;
          if (amount > 0)
          {
            planeMovement = Math.min(planeMovement, amount);
          }
        }

        if (!pointInside && planeMovement < LARGE_MOVEMENT)
        {
          movement = Math.min(movement, planeMovement);
        }
      }

      if (movement < LARGE_MOVEMENT)
      {
        movement *= 0.5;
        vec3.scaleAndAdd(this.center, this.center, rayDirection, movement);
        this.sizes[axisIndex] -= movement;
      }
    }
  }

  /** Returns one of Carbon's eight signed corner combinations. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon asserts the 0..7 range; JavaScript reports the same contract with RangeError.")
  GetPoint(index)
  {
    if (!Number.isInteger(index) || index < 0 || index > 7)
    {
      throw new RangeError("OBB point index must be an integer from 0 through 7");
    }

    return this.#WritePoint(vec3.create(), index);
  }

  /** Computes the axis-aligned bounds after applying one logical transform. */
  @carbon.method
  @impl.implemented
  ComputeAABB(min, max, transform)
  {
    const point = vec3.create();
    const transformed = vec3.create();
    this.#WritePoint(point, 0);
    vec3.transformMat4(transformed, point, transform);
    vec3.copy(min, transformed);
    vec3.copy(max, transformed);

    for (let index = 1; index < 8; index++)
    {
      this.#WritePoint(point, index);
      vec3.transformMat4(transformed, point, transform);
      vec3.min(min, min, transformed);
      vec3.max(max, max, transformed);
    }
  }

  /** Writes one corner using Carbon's ordered point table. */
  #WritePoint(out, index)
  {
    const signs = POINT_SIGNS[index];
    vec3.copy(out, this.center);
    vec3.scaleAndAdd(out, out, this.x, signs[0] * this.sizes[0]);
    vec3.scaleAndAdd(out, out, this.y, signs[1] * this.sizes[1]);
    vec3.scaleAndAdd(out, out, this.z, signs[2] * this.sizes[2]);
    return out;
  }

  /** Writes one corner selected by an XYZ sign bit mask. */
  #WriteMaskedPoint(out, mask)
  {
    vec3.copy(out, this.center);
    vec3.scaleAndAdd(out, out, this.x, (mask & 1 ? 1 : -1) * this.sizes[0]);
    vec3.scaleAndAdd(out, out, this.y, (mask & 2 ? 1 : -1) * this.sizes[1]);
    vec3.scaleAndAdd(out, out, this.z, (mask & 4 ? 1 : -1) * this.sizes[2]);
    return out;
  }

  /** x (Vector3) */
  @type.vec3
  x = vec3.create();

  /** y (Vector3) */
  @type.vec3
  y = vec3.create();

  /** z (Vector3) */
  @type.vec3
  z = vec3.create();

  /** center (Vector3) */
  @type.vec3
  center = vec3.create();

  /** sizes (Vector3) */
  @type.vec3
  sizes = vec3.create();

}
