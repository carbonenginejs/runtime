import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_time, _init_extra_time, _init_system, _init_extra_system, _init_parentTransform, _init_extra_parentTransform, _init_originShift, _init_extra_originShift, _init_emitCountFactor, _init_extra_emitCountFactor, _init_rateModifier, _init_extra_rateModifier;

/**
 * ITr2GenericEmitter (particle) - generated from schema shapeHash 164a42e6....
 *
 * Pure contract for particle emitters used with Tr2ParticleSystem
 * (ITr2GenericEmitter.h). Implementations (Tr2DynamicEmitter,
 * Tr2StaticEmitter) provide:
 *
 * - `Update(updateArguments)` - per-frame update. `updateArguments` is any
 *   record carrying the ITr2GenericEmitter::UpdateArguments fields mirrored by
 *   this class's properties: `time` (current system time, float seconds),
 *   `system` (scene GPU particle system, unused by CPU emitters),
 *   `parentTransform` (parent object world transform), `originShift` (world
 *   origin shift since the previous frame) and `emitCountFactor` (LOD factor
 *   for the number of particles to emit).
 * - `SpawnParticles(updateArguments, position, velocity, rateModifier)` -
 *   Carbon overload 1, called for "emit during lifetime" / "emit on death"
 *   emitters; `position`/`velocity` are the parent particle's values or null,
 *   `rateModifier` scales the emitter's configured rate.
 * - `SpawnParticles(updateArguments, positionStart, positionEnd,
 *   velocityStart, velocityEnd, deltaTime)` - Carbon overload 2 with
 *   begin/end-of-frame parent values for better distribution.
 * - `SetThreadSafeFlag()` - notifies the emitter that its spawn methods run
 *   concurrently in Carbon; vacuous in single-threaded JavaScript but kept
 *   for contract parity.
 *
 * CPU call sites additionally use the reduced
 * `SpawnParticles(position, velocity, rateModifier)` shape (Tr2ParticleSystem,
 * the collision constraints); implementations duck-type both.
 *
 * Instances of this class double as the UpdateArguments record.
 */
let _ITr2GenericEmitter;
class ITr2GenericEmitter extends CjsModel {
  static {
    ({
      e: [_init_time, _init_extra_time, _init_system, _init_extra_system, _init_parentTransform, _init_extra_parentTransform, _init_originShift, _init_extra_originShift, _init_emitCountFactor, _init_extra_emitCountFactor, _init_rateModifier, _init_extra_rateModifier],
      c: [_ITr2GenericEmitter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "ITr2GenericEmitter",
      family: "particle"
    })], [[[type, type.float64], 16, "time"], [type.objectRef("Tr2GpuParticleSystem"), 0, "system"], [[type, type.mat4], 16, "parentTransform"], [[type, type.vec3], 16, "originShift"], [[type, type.float32], 16, "emitCountFactor"], [[type, type.float32], 16, "rateModifier"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_rateModifier(this);
  }
  /** time (Be::Time) */
  time = _init_time(this, 0);

  /** system (Tr2GpuParticleSystem*) */
  system = (_init_extra_time(this), _init_system(this, null));

  /** parentTransform (Matrix) */
  parentTransform = (_init_extra_system(this), _init_parentTransform(this, mat4.create()));

  /** originShift (Vector3) */
  originShift = (_init_extra_parentTransform(this), _init_originShift(this, vec3.create()));

  /** emitCountFactor (float) */
  emitCountFactor = (_init_extra_originShift(this), _init_emitCountFactor(this, 1));

  /** rateModifier (float) */
  rateModifier = (_init_extra_emitCountFactor(this), _init_rateModifier(this, 0));
  static {
    _initClass();
  }
}

export { _ITr2GenericEmitter as ITr2GenericEmitter };
//# sourceMappingURL=ITr2GenericEmitter.js.map
