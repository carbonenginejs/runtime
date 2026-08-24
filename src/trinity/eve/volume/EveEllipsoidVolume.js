// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume.h
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume.cpp
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume_Blue.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { IEveVolume } from "./IEveVolume.js";
import { carbon, impl, io, type } from "#schema";


/**
 * Oriented ellipsoid of influence with a hollow inner ellipsoid, weighting
 * points by falloff and seeding random points between the two shells.
 */
@type.define({
  className: "EveEllipsoidVolume",
  family: "eve/volume"
})
export class EveEllipsoidVolume extends IEveVolume
{
  @io.persist
  @type.string
  name = "";

  @io.notify
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.notify
  @io.persist
  @type.quat
  rotation = quat.create();

  @io.notify
  @io.persist
  @type.vec3
  innerShape = vec3.create();

  @io.notify
  @io.persist
  @type.vec3
  shape = vec3.create();

  @io.readwrite
  @type.boolean
  debugShowIntersection = false;

  #callbacks = new Map();

  #nextCallbackId = 1;

  #inverseRotation = quat.create();

  /**
   * Clamps the authored shapes, caches the inverse rotation and fires the change
   * callbacks.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#setup(true);
    return true;
  }

  /**
   * Returns a fresh sphere centred on the volume position with the largest shape
   * radius, so it covers the ellipsoid on every axis.
   */
  @carbon.method
  @impl.adapted
  GetBoundingSphere()
  {
    return {
      center: vec3.clone(this.position),
      radius: Math.max(this.shape[0], this.shape[1], this.shape[2])
    };
  }

  /**
   * Returns the falloff weight for a point given in the volume's own space: the
   * point is moved into ellipsoid-local space with the cached inverse rotation,
   * then compared radially against the inner and outer shapes - 1 inside the
   * inner ellipsoid, 0 outside the outer one, and a squared ramp between them.
   */
  @carbon.method
  @impl.adapted
  GetIntensity(position)
  {
    const local = vec3.subtract(vec3.create(), position, this.position);
    vec3.transformQuat(local, local, this.#inverseRotation);
    const outer = EveEllipsoidVolume.#radialDistance(local, this.shape);
    const distance = vec3.length(local);
    if (!(outer > 0) || distance > outer)
    {
      return 0;
    }
    const inner = EveEllipsoidVolume.#radialDistance(local, this.innerShape);
    if (inner > 0 && distance <= inner)
    {
      return 1;
    }
    const span = outer - inner;
    const ratio = span > 0 ? (outer - distance) / span : 0;
    return ratio * ratio;
  }

  /**
   * Appends random points expressed in ellipsoid-local space, centred on the ellipsoid rather than offset by its position, split between the inner ellipsoid and the shell by their volume ratio biased with fallOffFactor.
   *
   * @param points Caller-owned array the new points are pushed onto.
   * @param excludeInnerVolume Keeps every point in the shell between the inner and outer shapes.
   */
  @carbon.method
  @impl.adapted
  GeneratePointsInVolume(points, howManyToAdd, excludeInnerVolume, fallOffFactor)
  {
    const count = Math.max(0, Math.trunc(howManyToAdd));
    let innerSelectionChance = 0;
    if (!excludeInnerVolume)
    {
      innerSelectionChance = this.innerShape[0] * this.innerShape[1] * this.innerShape[2]
        / (this.shape[0] * this.shape[1] * this.shape[2]);
      innerSelectionChance = 1 - Math.pow(
        1 - innerSelectionChance,
        0.6 + 0.4 * fallOffFactor
      );
    }

    for (let i = 0; i < count; i++)
    {
      const angle = Math.PI * 2 * Math.random();
      const z = Math.random() * 2 - 1;
      const radial = Math.sqrt(1 - z * z);
      const direction = vec3.normalize(vec3.create(), vec3.fromValues(
        radial * Math.cos(angle),
        radial * Math.sin(angle),
        z
      ));

      const position = vec3.create();
      if (Math.random() > innerSelectionChance)
      {
        const distance = Math.pow(Math.random(), 0.75 * fallOffFactor);
        for (let axis = 0; axis < 3; axis++)
        {
          position[axis] = direction[axis]
            * (this.innerShape[axis] + (this.shape[axis] - this.innerShape[axis]) * distance);
        }
      }
      else
      {
        const distance = Math.pow(Math.random(), 1 / 3);
        for (let axis = 0; axis < 3; axis++)
        {
          position[axis] = direction[axis] * this.innerShape[axis] * distance;
        }
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
   * Re-clamps the shapes and the cached inverse rotation after an authored
   * change, and notifies every registered listener.
   */
  @carbon.method
  @impl.adapted
  OnModified()
  {
    this.#setup(true);
    return true;
  }

  /** No debug drawing in this port. */
  @carbon.method
  @impl.noop
  RenderDebugInfo()
  {
  }

  /**
   * Clamps the shape to non-negative radii, keeps the inner shape inside it,
   * caches the inverse rotation and optionally fires the change callbacks.
   */
  #setup(notify)
  {
    for (let i = 0; i < 3; i++)
    {
      this.shape[i] = Math.max(0, this.shape[i]);
      this.innerShape[i] = Math.min(Math.max(0, this.innerShape[i]), this.shape[i]);
    }
    quat.invert(this.#inverseRotation, this.rotation);
    if (notify)
    {
      for (const callback of this.#callbacks.values())
      {
        callback?.();
      }
    }
  }

  /**
   * Returns how far the ellipsoid surface lies from the centre along the
   * direction of the given local point, the smallest radius when the point sits
   * at the centre, and 0 when the direction has an extent-less axis.
   */
  static #radialDistance(position, radii)
  {
    const length = vec3.length(position);
    if (length === 0)
    {
      return Math.min(radii[0], radii[1], radii[2]);
    }
    let denominator = 0;
    for (let i = 0; i < 3; i++)
    {
      if (radii[i] <= 0 && position[i] !== 0)
      {
        return 0;
      }
      if (radii[i] > 0)
      {
        const direction = position[i] / length;
        denominator += direction * direction / (radii[i] * radii[i]);
      }
    }
    return denominator > 0 ? 1 / Math.sqrt(denominator) : 0;
  }
}
