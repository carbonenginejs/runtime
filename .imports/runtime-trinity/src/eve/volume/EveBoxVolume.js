// Source: E:\carbonengine\trinity\trinity\Eve\Volume\EveBoxVolume.h
// Source: E:\carbonengine\trinity\trinity\Eve\Volume\EveBoxVolume.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\Volume\EveBoxVolume_Blue.cpp
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Oriented box of influence with a hollow inner box, weighting points by falloff
 * and seeding random points across its shell.
 */
@type.define({
  className: "EveBoxVolume",
  family: "eve/volume"
})
export class EveBoxVolume extends CjsModel
{
  @io.notify
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.notify
  @io.persist
  @type.vec3
  scaling = vec3.create();

  @io.notify
  @io.persist
  @type.vec3
  innerScaling = vec3.create();

  @io.notify
  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.string
  name = "";

  @io.readwrite
  @type.boolean
  debugShowIntersection = false;

  #callbacks = new Map();

  #nextCallbackId = 1;

  #inverseRotation = quat.create();

  /**
   * Clamps the authored scalings and caches the inverse rotation the intensity
   * test needs.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#setup();
    return true;
  }

  /**
   * Returns a fresh sphere centred on the box position whose radius is half the
   * length of the scaling vector.
   */
  @carbon.method
  @impl.adapted
  GetBoundingSphere()
  {
    return {
      center: vec3.clone(this.position),
      radius: vec3.length(this.scaling) * 0.5
    };
  }

  /**
   * Returns the falloff weight for a point given in the volume's own space: the
   * point is moved into box-local space with the cached inverse rotation, then
   * compared radially against the inner and outer boxes - 1 inside the inner
   * box, 0 outside the outer one, and a squared ramp between them.
   */
  @carbon.method
  @impl.adapted
  GetIntensity(position)
  {
    const local = EveBoxVolume.#toLocal(position, this.position, this.#inverseRotation);
    const outer = EveBoxVolume.#radialBoxDistance(local, this.scaling);
    const distance = vec3.length(local);
    if (!(outer > 0) || distance > outer)
    {
      return 0;
    }
    const inner = EveBoxVolume.#radialBoxDistance(local, this.innerScaling);
    if (inner > 0 && distance <= inner)
    {
      return 1;
    }
    const span = outer - inner;
    const ratio = span > 0 ? (outer - distance) / span : 0;
    return ratio * ratio;
  }

  /**
   * Appends random points expressed in box-local space, centred on the box rather than offset by its position, choosing between the inner box and the six shell zones in proportion to their volumes and biasing shell samples outward by fallOffFactor. Generates nothing when any scaling axis is zero.
   *
   * @param points Caller-owned array the new points are pushed onto.
   * @param excludeInnerVolume Drops the inner box from the choice, keeping every point in the shell.
   */
  @carbon.method
  @impl.adapted
  GeneratePointsInVolume(points, howManyToAdd, excludeInnerVolume, fallOffFactor)
  {
    if (this.scaling[0] === 0 || this.scaling[1] === 0 || this.scaling[2] === 0)
    {
      return;
    }

    const leftRightSideSize = (this.scaling[0] - this.innerScaling[0])
      * this.scaling[1] * this.scaling[2];
    const topBottomSize = this.innerScaling[0]
      * (this.scaling[1] - this.innerScaling[1]) * this.scaling[2];
    const frontBackLidSize = this.innerScaling[0] * this.innerScaling[1]
      * (this.scaling[2] - this.innerScaling[2]);
    const outerSidesSize = 2 * (leftRightSideSize + topBottomSize + frontBackLidSize);
    let innerToOuterSizeRatio = 0;

    if (!excludeInnerVolume)
    {
      const rangeX = this.scaling[0] - this.innerScaling[0];
      const rangeY = this.scaling[1] - this.innerScaling[1];
      const rangeZ = this.scaling[2] - this.innerScaling[2];
      const adjustedOuterCubeSize = (this.innerScaling[0] + 0.5 * rangeX)
        * (this.innerScaling[1] + 0.5 * rangeY)
        * (this.innerScaling[2] + 0.5 * rangeZ);
      innerToOuterSizeRatio = this.innerScaling[0] * this.innerScaling[1]
        * this.innerScaling[2] / adjustedOuterCubeSize;
      innerToOuterSizeRatio = 1 - Math.pow(
        1 - innerToOuterSizeRatio,
        0.8 + 0.2 * fallOffFactor
      );
    }

    const count = Math.max(0, Math.trunc(howManyToAdd));
    for (let i = 0; i < count; i++)
    {
      let zonePicker = Math.random();
      if (zonePicker < innerToOuterSizeRatio)
      {
        points.push(vec3.fromValues(
          this.innerScaling[0] * Math.random() - 0.5 * this.innerScaling[0],
          this.innerScaling[1] * Math.random() - 0.5 * this.innerScaling[1],
          this.innerScaling[2] * Math.random() - 0.5 * this.innerScaling[2]
        ));
        continue;
      }

      zonePicker *= outerSidesSize;
      const position = vec3.create();
      if (zonePicker < 2 * leftRightSideSize)
      {
        const distance = 0.5 * this.innerScaling[0]
          + Math.pow(Math.random(), fallOffFactor)
          * (this.scaling[0] - this.innerScaling[0]) * 0.5;
        position[0] = zonePicker < leftRightSideSize ? distance : -distance;
        position[1] = Math.random() * this.scaling[1] - 0.5 * this.scaling[1];
        position[2] = Math.random() * this.scaling[2] - 0.5 * this.scaling[2];
      }
      else if (zonePicker < 2 * (leftRightSideSize + topBottomSize))
      {
        const distance = 0.5 * this.innerScaling[1]
          + Math.pow(Math.random(), fallOffFactor)
          * (this.scaling[1] - this.innerScaling[1]) * 0.5;
        position[0] = Math.random() * this.innerScaling[0] - 0.5 * this.innerScaling[0];
        position[1] = zonePicker < 2 * leftRightSideSize + topBottomSize ? distance : -distance;
        position[2] = Math.random() * this.scaling[2] - 0.5 * this.scaling[2];
      }
      else
      {
        // Carbon uses the Y dimensions for the front/back distance here.
        const distance = 0.5 * this.innerScaling[1]
          + Math.pow(Math.random(), fallOffFactor)
          * (this.scaling[1] - this.innerScaling[1]) * 0.5;
        position[0] = Math.random() * this.innerScaling[0] - 0.5 * this.innerScaling[0];
        position[1] = Math.random() * this.innerScaling[1] - 0.5 * this.innerScaling[1];
        position[2] = zonePicker < outerSidesSize - frontBackLidSize ? distance : -distance;
      }
      points.push(position);
    }
  }

  /**
   * Registers a callback fired whenever the volume changes, returning the id
   * needed to unregister it again.
   */
  @carbon.method
  @impl.adapted
  RegisterForChanges(callback)
  {
    const id = this.#nextCallbackId++;
    this.#callbacks.set(id, callback);
    return id;
  }

  /** Drops a change callback by the id RegisterForChanges returned. */
  @carbon.method
  @impl.implemented
  UnregisterForChanges(callbackId)
  {
    this.#callbacks.delete(callbackId);
  }

  /**
   * Re-clamps the scalings and the cached inverse rotation after an authored
   * change, then notifies every registered listener.
   */
  @carbon.method
  @impl.adapted
  OnModified()
  {
    this.#setup();
    for (const callback of this.#callbacks.values())
    {
      callback?.();
    }
    return true;
  }

  /** No debug drawing in this port. */
  @carbon.method
  @impl.noop
  RenderDebugInfo()
  {
  }

  /**
   * Clamps the scaling to non-negative values, keeps the inner scaling inside
   * it, and caches the inverse of the box rotation.
   */
  #setup()
  {
    for (let i = 0; i < 3; i++)
    {
      this.scaling[i] = Math.max(0, this.scaling[i]);
      this.innerScaling[i] = Math.min(Math.max(0, this.innerScaling[i]), this.scaling[i]);
    }
    quat.invert(this.#inverseRotation, this.rotation);
  }

  /**
   * Moves a point into box-local space by subtracting the box centre and
   * applying the inverse rotation.
   */
  static #toLocal(position, center, inverseRotation)
  {
    const local = vec3.subtract(vec3.create(), position, center);
    return vec3.transformQuat(local, local, inverseRotation);
  }

  /**
   * Returns how far the box surface lies from the centre along the direction of
   * the given local point, falling back to half the smallest extent when the
   * point sits at the centre.
   */
  static #radialBoxDistance(position, scaling)
  {
    const length = vec3.length(position);
    if (length === 0)
    {
      return Math.min(scaling[0], scaling[1], scaling[2]) * 0.5;
    }
    let distance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 3; i++)
    {
      const direction = Math.abs(position[i] / length);
      if (direction > 0)
      {
        distance = Math.min(distance, scaling[i] * 0.5 / direction);
      }
    }
    return Number.isFinite(distance) ? distance : 0;
  }
}
