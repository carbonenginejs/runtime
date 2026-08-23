import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_name, _init_extra_name;

/**
 * Sphere of influence with a solid inner radius and a falloff out to the outer
 * radius, weighting points and seeding random ones inside it.
 */
let _EveSphereVolume;
class EveSphereVolume extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_name, _init_extra_name, _initProto],
      c: [_EveSphereVolume, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSphereVolume",
      family: "eve/volume"
    })], [[[io, io.notify, io, io.persist, type, type.vec3], 16, "position"], [[void 0, io.flag("radius"), io, io.notify, io, io.persist, type, type.float32], 16, "radius"], [[void 0, io.flag("innerRadius"), io, io.notify, io, io.persist, type, type.float32], 16, "innerRadius"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetIntensity"], [[carbon, carbon.method, impl, impl.adapted], 18, "GeneratePointsInVolume"], [[carbon, carbon.method, impl, impl.adapted], 18, "RegisterForChanges"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterForChanges"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.noop], 18, "RenderDebugInfo"]], 0, void 0, CjsModel));
  }
  position = (_initProto(this), _init_position(this, vec3.create()));
  radius = (_init_extra_position(this), _init_radius(this, 1));
  innerRadius = (_init_extra_radius(this), _init_innerRadius(this, 1));
  name = (_init_extra_innerRadius(this), _init_name(this, ""));
  #callbacks = (_init_extra_name(this), new Map());
  #nextCallbackId = 1;

  /** Returns a fresh sphere centred on the volume position with its outer radius. */
  GetBoundingSphere() {
    return {
      center: vec3.clone(this.position),
      radius: this.radius
    };
  }

  /**
   * Returns the falloff weight for a point given in the volume's own space: 1
   * within the inner radius, 0 past the outer radius, and a ramp that is linear
   * in squared distance between them.
   */
  GetIntensity(position) {
    const distanceSq = vec3.squaredDistance(position, this.position);
    const outerRadiusSq = this.radius * this.radius;
    if (distanceSq > outerRadiusSq) {
      return 0;
    }
    const innerRadiusSq = this.innerRadius * this.innerRadius;
    if (distanceSq <= innerRadiusSq) {
      return 1;
    }
    const interpolationDistance = outerRadiusSq - innerRadiusSq;
    return interpolationDistance > 0 ? 1 - (distanceSq - innerRadiusSq) / interpolationDistance : 0;
  }

  /**
   * Appends random points expressed relative to the sphere centre rather than offset by its position, spread in direction uniformly over the sphere and in distance between the inner and outer radius as shaped by fallOffFactor.
   *
   * @param points Caller-owned array the new points are pushed onto.
   * @param excludeInnerVolume Keeps every point outside the inner radius.
   */
  GeneratePointsInVolume(points, howManyToAdd, excludeInnerVolume, fallOffFactor) {
    const count = Math.max(0, Math.trunc(howManyToAdd));
    const radiusRange = this.radius - this.innerRadius;
    let innerSelectionChance = 0;
    if (!excludeInnerVolume) {
      const adjustedOuterRadius = this.innerRadius + 0.5 * radiusRange;
      innerSelectionChance = this.innerRadius ** 2 / adjustedOuterRadius ** 2;
    }
    for (let i = 0; i < count; i++) {
      let distance;
      if (excludeInnerVolume) {
        distance = this.innerRadius + radiusRange * Math.pow(Math.random(), 1 / 3);
      } else if (Math.random() < innerSelectionChance) {
        distance = this.innerRadius * Math.pow(Math.random(), 1 / 3);
      } else {
        distance = this.innerRadius + radiusRange * Math.pow(Math.random(), fallOffFactor);
      }
      const angle = Math.PI * 2 * Math.random();
      const z = Math.random() * 2 - 1;
      const radial = Math.sqrt(1 - z * z);
      points.push(vec3.fromValues(radial * Math.cos(angle) * distance, radial * Math.sin(angle) * distance, z * distance));
    }
  }

  /**
   * Registers a callback fired whenever the volume changes, returning the id
   * needed to unregister it again.
   */
  RegisterForChanges(callback) {
    const id = this.#nextCallbackId++;
    this.#callbacks.set(id, callback);
    return id;
  }

  /** Drops a change callback by the id RegisterForChanges returned. */
  UnregisterForChanges(callbackId) {
    this.#callbacks.delete(callbackId);
  }

  /**
   * Clamps the radii so the outer radius stays non-negative and never smaller
   * than the inner one, then notifies every registered listener.
   */
  OnModified(_options = {}) {
    const flags = this.__state.flags;
    if (flags.delete("innerRadius") && this.innerRadius > this.radius) {
      this.radius = this.innerRadius;
    }
    if (flags.delete("radius")) {
      this.radius = Math.max(0, this.radius);
      if (this.innerRadius > this.radius) {
        this.innerRadius = this.radius;
      }
    }
    for (const callback of this.#callbacks.values()) {
      callback?.();
    }
    return true;
  }

  /** No debug drawing in this port. */
  RenderDebugInfo() {}
  static {
    _initClass();
  }
}

export { _EveSphereVolume as EveSphereVolume };
//# sourceMappingURL=EveSphereVolume.js.map
