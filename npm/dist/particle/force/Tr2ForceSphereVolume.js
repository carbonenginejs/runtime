import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_exponent, _init_extra_exponent, _init_forces, _init_extra_forces, _init_position, _init_extra_position, _init_radius, _init_extra_radius;

/** Aggregates child forces within a spherical region, scaling their combined contribution by a falloff toward the sphere's edge. */
let _Tr2ForceSphereVolume;
new class extends _identity {
  static [class Tr2ForceSphereVolume extends CjsModel {
    static {
      ({
        e: [_init_exponent, _init_extra_exponent, _init_forces, _init_extra_forces, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _initProto],
        c: [_Tr2ForceSphereVolume, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ForceSphereVolume",
        family: "particle"
      })], [[[io, io.persist, type, type.float32], 16, "exponent"], [[io, io.persist, void 0, type.list("ITr2ParticleForce")], 16, "forces"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "radius"], [[impl, impl.noop], 18, "Update"], [[impl, impl.adapted], 18, "GetForce"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_radius(this);
    }
    // Per-instance scratch: volumes can nest other volumes, so a class-static
    // accumulator would alias between the outer and inner GetForce calls.
    #contribution = (_initProto(this), vec3.create());

    /** m_exponent (float) [READWRITE, PERSIST] */
    exponent = _init_exponent(this, 1);

    /** m_forces (PITr2ParticleForceVector) [READ, PERSIST] */
    forces = (_init_extra_exponent(this), _init_forces(this, []));

    /** m_position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_forces(this), _init_position(this, vec3.create()));

    /** m_radius (float) [READWRITE, PERSIST] */
    radius = (_init_extra_position(this), _init_radius(this, 1));

    /**
     * Carbon's Update is declared inline empty (Tr2ForceSphereVolume.h:20-22);
     * the contained forces intentionally do NOT receive per-frame updates
     * through the volume.
     */
    /**
     * Does nothing: the contained forces are not updated through the volume.
     */
    Update(_dt) {}

    /**
     * Child-force aggregation with (1 - d/r)^exponent falloff inside the sphere
     * (Tr2ForceSphereVolume.cpp:38-59).
     */
    GetForce(position, velocity, dt, mass, out = vec3.create()) {
      vec3.set(out, 0, 0, 0);
      const delta = _Tr2ForceSphereVolume.#delta;
      vec3.subtract(delta, position, this.position);
      const distance = vec3.length(delta);
      if (!(distance < this.radius)) {
        return out;
      }
      const contribution = this.#contribution;
      for (const force of this.forces) {
        if (typeof force?.GetForce !== "function") {
          throw new TypeError("Sphere-volume forces must implement Carbon's GetForce contract.");
        }
        vec3.set(contribution, 0, 0, 0);
        vec3.add(out, out, force.GetForce(position, velocity, dt, mass, contribution) ?? contribution);
      }
      return vec3.scale(out, out, Math.pow(1 - distance / this.radius, this.exponent));
    }

    // #delta is consumed into a scalar before any child GetForce runs, so a
    // class-static scratch cannot alias across nested volumes.
  }];
  #delta = vec3.create();
  constructor() {
    super(_Tr2ForceSphereVolume), _initClass();
  }
}();

export { _Tr2ForceSphereVolume as Tr2ForceSphereVolume };
//# sourceMappingURL=Tr2ForceSphereVolume.js.map
