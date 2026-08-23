import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_continuousEmitter, _init_extra_continuousEmitter, _init_rate, _init_extra_rate, _init_emissionDensity, _init_extra_emissionDensity, _init_maxEmissionDensity, _init_extra_maxEmissionDensity, _init_maxDisplacement, _init_extra_maxDisplacement, _init_position, _init_extra_position, _init_direction, _init_extra_direction, _init_angle, _init_extra_angle, _init_innerAngle, _init_extra_innerAngle, _init_radius, _init_extra_radius, _init_inheritVelocity, _init_extra_inheritVelocity, _init_minSpeed, _init_extra_minSpeed, _init_maxSpeed, _init_extra_maxSpeed, _init_minLifeTime, _init_extra_minLifeTime, _init_maxLifeTime, _init_extra_maxLifeTime, _init_sizes, _init_extra_sizes, _init_sizeVariance, _init_extra_sizeVariance, _init_color, _init_extra_color, _init_color2, _init_extra_color2, _init_color3, _init_extra_color3, _init_color4, _init_extra_color4, _init_textureIndex, _init_extra_textureIndex, _init_colorMidpoint, _init_extra_colorMidpoint, _init_velocityStretchRotation, _init_extra_velocityStretchRotation, _init_drag, _init_extra_drag, _init_turbulenceAmplitude, _init_extra_turbulenceAmplitude, _init_turbulenceFrequency, _init_extra_turbulenceFrequency, _init_gravity, _init_extra_gravity;

/**
 * Authored parameters of a GPU particle emitter: emission cone and rate,
 * particle lifetime and speed range, size and colour ramp, and the drag,
 * turbulence and gravity terms the simulation applies.
 */
let _Tr2GpuSharedEmitter;
new class extends _identity {
  static [class Tr2GpuSharedEmitter extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_continuousEmitter, _init_extra_continuousEmitter, _init_rate, _init_extra_rate, _init_emissionDensity, _init_extra_emissionDensity, _init_maxEmissionDensity, _init_extra_maxEmissionDensity, _init_maxDisplacement, _init_extra_maxDisplacement, _init_position, _init_extra_position, _init_direction, _init_extra_direction, _init_angle, _init_extra_angle, _init_innerAngle, _init_extra_innerAngle, _init_radius, _init_extra_radius, _init_inheritVelocity, _init_extra_inheritVelocity, _init_minSpeed, _init_extra_minSpeed, _init_maxSpeed, _init_extra_maxSpeed, _init_minLifeTime, _init_extra_minLifeTime, _init_maxLifeTime, _init_extra_maxLifeTime, _init_sizes, _init_extra_sizes, _init_sizeVariance, _init_extra_sizeVariance, _init_color, _init_extra_color, _init_color2, _init_extra_color2, _init_color3, _init_extra_color3, _init_color4, _init_extra_color4, _init_textureIndex, _init_extra_textureIndex, _init_colorMidpoint, _init_extra_colorMidpoint, _init_velocityStretchRotation, _init_extra_velocityStretchRotation, _init_drag, _init_extra_drag, _init_turbulenceAmplitude, _init_extra_turbulenceAmplitude, _init_turbulenceFrequency, _init_extra_turbulenceFrequency, _init_gravity, _init_extra_gravity, _initProto],
        c: [_Tr2GpuSharedEmitter, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2GpuSharedEmitter",
        family: "particle"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "continuousEmitter"], [[io, io.persist, type, type.float32], 16, "rate"], [[io, io.persist, type, type.float32], 16, "emissionDensity"], [[io, io.persist, type, type.float32], 16, "maxEmissionDensity"], [[io, io.persist, type, type.float32], 16, "maxDisplacement"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.vec3], 16, "direction"], [[io, io.persist, type, type.float32], 16, "angle"], [[io, io.persist, type, type.float32], 16, "innerAngle"], [[io, io.persist, type, type.float32], 16, "radius"], [[io, io.persist, type, type.float32], 16, "inheritVelocity"], [[io, io.persist, type, type.float32], 16, "minSpeed"], [[io, io.persist, type, type.float32], 16, "maxSpeed"], [[io, io.notify, io, io.persist, type, type.float32], 16, "minLifeTime"], [[io, io.notify, io, io.persist, type, type.float32], 16, "maxLifeTime"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "sizes"], [[io, io.notify, io, io.persist, type, type.float32], 16, "sizeVariance"], [[io, io.notify, io, io.persist, type, type.color], 16, "color0"], [[io, io.notify, io, io.persist, type, type.color], 16, "color1"], [[io, io.notify, io, io.persist, type, type.color], 16, "color2"], [[io, io.notify, io, io.persist, type, type.color], 16, "color3"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "textureIndex"], [[io, io.notify, io, io.persist, type, type.float32], 16, "colorMidpoint"], [[io, io.notify, io, io.persist, type, type.float32], 16, "velocityStretchRotation"], [[io, io.notify, io, io.persist, type, type.float32], 16, "drag"], [[io, io.notify, io, io.persist, type, type.float32], 16, "turbulenceAmplitude"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "turbulenceFrequency"], [[io, io.notify, io, io.persist, type, type.float32], 16, "gravity"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "Enable"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsEnabled"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDirection"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Projects Carbon's setup structs onto the schema-backed editor fields; renderer-only spawn history and transformed parameters remain adapter-owned.")], 18, "Setup"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetRevision"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));
    continuousEmitter = (_init_extra_name(this), _init_continuousEmitter(this, true));
    rate = (_init_extra_continuousEmitter(this), _init_rate(this, 0));
    emissionDensity = (_init_extra_rate(this), _init_emissionDensity(this, 0));
    maxEmissionDensity = (_init_extra_emissionDensity(this), _init_maxEmissionDensity(this, 10000));
    maxDisplacement = (_init_extra_maxEmissionDensity(this), _init_maxDisplacement(this, 1000));
    position = (_init_extra_maxDisplacement(this), _init_position(this, vec3.create()));
    direction = (_init_extra_position(this), _init_direction(this, vec3.fromValues(0, 1, 0)));
    angle = (_init_extra_direction(this), _init_angle(this, 0));
    innerAngle = (_init_extra_angle(this), _init_innerAngle(this, 0));
    radius = (_init_extra_innerAngle(this), _init_radius(this, 0));
    inheritVelocity = (_init_extra_radius(this), _init_inheritVelocity(this, 1));
    minSpeed = (_init_extra_inheritVelocity(this), _init_minSpeed(this, 0));
    maxSpeed = (_init_extra_minSpeed(this), _init_maxSpeed(this, 0));
    minLifeTime = (_init_extra_maxSpeed(this), _init_minLifeTime(this, 0));
    maxLifeTime = (_init_extra_minLifeTime(this), _init_maxLifeTime(this, 0));
    sizes = (_init_extra_maxLifeTime(this), _init_sizes(this, vec3.create()));
    sizeVariance = (_init_extra_sizes(this), _init_sizeVariance(this, 0));
    color0 = (_init_extra_sizeVariance(this), _init_color(this, vec4.createLinear()));
    color1 = (_init_extra_color(this), _init_color2(this, vec4.createLinear()));
    color2 = (_init_extra_color2(this), _init_color3(this, vec4.createLinear()));
    color3 = (_init_extra_color3(this), _init_color4(this, vec4.createLinear()));
    textureIndex = (_init_extra_color4(this), _init_textureIndex(this, 0));
    colorMidpoint = (_init_extra_textureIndex(this), _init_colorMidpoint(this, 0.5));
    velocityStretchRotation = (_init_extra_colorMidpoint(this), _init_velocityStretchRotation(this, 0));
    drag = (_init_extra_velocityStretchRotation(this), _init_drag(this, 0));
    turbulenceAmplitude = (_init_extra_drag(this), _init_turbulenceAmplitude(this, 0));
    turbulenceFrequency = (_init_extra_turbulenceAmplitude(this), _init_turbulenceFrequency(this, 1));
    gravity = (_init_extra_turbulenceFrequency(this), _init_gravity(this, 0));
    #enabled = (_init_extra_gravity(this), true);
    #previousTime = -1;
    #revision = 0;

    /**
     * Bumps the revision so a renderer holding this emitter rebuilds from it;
     * there are no GPU resources to create here.
     */
    Initialize() {
      this.#revision++;
      return true;
    }

    /**
     * Bumps the revision so a renderer holding this emitter picks up the changed
     * parameters.
     */
    OnModified() {
      this.#revision++;
      return true;
    }

    /**
     * Turns emission on or off; disabling also clears the spawn-time cursor so
     * re-enabling restarts timing instead of catching up on the idle interval.
     */
    Enable(value) {
      this.#enabled = !!value;
      if (!this.#enabled) this.#previousTime = -1;
    }

    /** Reports whether this emitter is currently emitting. */
    IsEnabled() {
      return this.#enabled;
    }

    /** Sets the emission cone axis in place, treating a missing value as zero. */
    SetDirection(value) {
      vec3.copy(this.direction, value || _Tr2GpuSharedEmitter.#zero3);
    }

    /** Sets the emitter origin in place, treating a missing value as zero. */
    SetPosition(value) {
      vec3.copy(this.position, value || _Tr2GpuSharedEmitter.#zero3);
    }

    /**
     * Projects Carbon's emitter and particle-parameter structs onto the schema-backed fields in one batched, event-free update followed by a single UpdateValues.
     * @param {object} emitterData emission shape and speed range; missing members fall back to the current values
     * @param {object} paramsData per-particle parameters; colors may be supplied either as a colors array or as color0..color3
     * attractorStrength is only forwarded on subclasses that declare it.
     */
    Setup(rate, emitterData, paramsData) {
      const emitter = emitterData || {};
      const parameters = paramsData || {};
      const colors = parameters.colors || [];
      const values = {
        rate,
        radius: emitter.radius,
        angle: emitter.angle,
        innerAngle: emitter.innerAngle,
        minSpeed: emitter.minSpeed,
        maxSpeed: emitter.maxSpeed,
        minLifeTime: parameters.minLifeTime,
        maxLifeTime: parameters.maxLifeTime,
        textureIndex: parameters.textureIndex,
        colorMidpoint: parameters.colorMidpoint ?? 0.5,
        color0: colors[0] ?? parameters.color0,
        color1: colors[1] ?? parameters.color1,
        color2: colors[2] ?? parameters.color2,
        color3: colors[3] ?? parameters.color3,
        sizes: parameters.sizes,
        sizeVariance: parameters.sizeVariance,
        drag: parameters.drag,
        turbulenceAmplitude: parameters.turbulenceAmplitude,
        turbulenceFrequency: parameters.turbulenceFrequency ?? 1,
        gravity: parameters.gravity,
        velocityStretchRotation: parameters.velocityStretchRotation
      };
      if ("attractorStrength" in this) {
        values.attractorStrength = parameters.attractorStrength;
      }
      this.SetValues(values, {
        source: this,
        skipEvents: true,
        skipUpdate: true
      });
      this.UpdateValues({
        source: this,
        skipEvents: true
      });
    }

    /**
     * Returns the counter bumped by Initialize and OnModified, which a renderer
     * compares against its own copy to detect parameter changes.
     */
    GetRevision() {
      return this.#revision;
    }
  }];
  #zero3 = vec3.create();
  constructor() {
    super(_Tr2GpuSharedEmitter), _initClass();
  }
}();

export { _Tr2GpuSharedEmitter as Tr2GpuSharedEmitter };
//# sourceMappingURL=Tr2GpuSharedEmitter.js.map
