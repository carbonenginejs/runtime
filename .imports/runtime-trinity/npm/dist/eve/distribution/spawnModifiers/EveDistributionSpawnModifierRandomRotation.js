import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { getDistributionSeed, createMinStdRandom, setYawPitchRoll } from '../../CjsDistributionRandom.js';

let _initProto, _initClass, _init_minRotation, _init_extra_minRotation, _init_maxRotation, _init_extra_maxRotation, _init_consistentRandom, _init_extra_consistentRandom, _init_overrideRotation, _init_extra_overrideRotation;

/** EveDistributionSpawnModifierRandomRotation (eve/distribution/spawnModifiers) - generated from schema shapeHash 18d6f646.... */
let _EveDistributionSpawn;
class EveDistributionSpawnModifierRandomRotation extends CjsModel {
  static {
    ({
      e: [_init_minRotation, _init_extra_minRotation, _init_maxRotation, _init_extra_maxRotation, _init_consistentRandom, _init_extra_consistentRandom, _init_overrideRotation, _init_extra_overrideRotation, _initProto],
      c: [_EveDistributionSpawn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionSpawnModifierRandomRotation",
      family: "eve/distribution/spawnModifiers"
    })], [[[io, io.persist, type, type.vec3], 16, "minRotation"], [[io, io.persist, type, type.vec3], 16, "maxRotation"], [[io, io.persist, type, type.boolean], 16, "consistentRandom"], [[io, io.persist, type, type.boolean], 16, "overrideRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "ProcessSpawnModifier"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_overrideRotation(this);
  }
  #timeSeed = (_initProto(this), Date.now() >>> 0);

  /** m_minRotation (Vector3) [READWRITE, PERSIST] */
  minRotation = _init_minRotation(this, vec3.create());

  /** m_maxRotation (Vector3) [READWRITE, PERSIST] */
  maxRotation = (_init_extra_minRotation(this), _init_maxRotation(this, vec3.create()));

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  consistentRandom = (_init_extra_maxRotation(this), _init_consistentRandom(this, false));

  /** m_overrideRotation (bool) [READWRITE, PERSIST] */
  overrideRotation = (_init_extra_consistentRandom(this), _init_overrideRotation(this, false));

  /**
   * Reseeds the random stream from the wall clock, so rotations differ between
   * runs unless consistentRandom pins them to the placement id.
   */
  Initialize() {
    this.#timeSeed = Date.now() >>> 0;
    return true;
  }

  /**
   * Builds a rotation from random yaw, pitch and roll between minRotation and
   * maxRotation, then either replaces the placement's initial rotation or
   * combines it with the authored one.
   */
  ProcessSpawnModifier(placement, _numPlacements) {
    const seed = getDistributionSeed(placement.uniqueID, this.#timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const euler = vec3.create();
    for (let axis = 0; axis < 3; axis++) {
      euler[axis] = this.minRotation[axis] + (this.maxRotation[axis] - this.minRotation[axis]) * random();
    }
    const rotation = setYawPitchRoll(quat.create(), euler[0], euler[1], euler[2]);
    if (this.overrideRotation) {
      placement.initialRotation.set(rotation);
    } else {
      // Carbon (row-vector): rotation * initialRotation - the random rotation
      // applies first.
      quat.multiply(placement.initialRotation, placement.initialRotation, rotation);
    }
  }
  static {
    _initClass();
  }
}

export { _EveDistributionSpawn as EveDistributionSpawnModifierRandomRotation };
//# sourceMappingURL=EveDistributionSpawnModifierRandomRotation.js.map
