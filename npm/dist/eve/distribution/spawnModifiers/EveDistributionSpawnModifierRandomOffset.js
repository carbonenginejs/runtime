import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { getDistributionSeed, createMinStdRandom } from '../../CjsDistributionRandom.js';

let _initProto, _initClass, _init_minOffset, _init_extra_minOffset, _init_maxOffset, _init_extra_maxOffset, _init_consistentRandom, _init_extra_consistentRandom, _init_uniformOffset, _init_extra_uniformOffset;

/** EveDistributionSpawnModifierRandomOffset (eve/distribution/spawnModifiers) - generated from schema shapeHash 65d2580b.... */
let _EveDistributionSpawn;
class EveDistributionSpawnModifierRandomOffset extends CjsModel {
  static {
    ({
      e: [_init_minOffset, _init_extra_minOffset, _init_maxOffset, _init_extra_maxOffset, _init_consistentRandom, _init_extra_consistentRandom, _init_uniformOffset, _init_extra_uniformOffset, _initProto],
      c: [_EveDistributionSpawn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionSpawnModifierRandomOffset",
      family: "eve/distribution/spawnModifiers"
    })], [[[io, io.persist, type, type.vec3], 16, "minOffset"], [[io, io.persist, type, type.vec3], 16, "maxOffset"], [[io, io.persist, type, type.boolean], 16, "consistentRandom"], [[io, io.persist, type, type.boolean], 16, "uniformOffset"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "ProcessSpawnModifier"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_uniformOffset(this);
  }
  #timeSeed = (_initProto(this), Date.now() >>> 0);

  /** m_minOffset (Vector3) [READWRITE, PERSIST] */
  minOffset = _init_minOffset(this, vec3.create());

  /** m_maxOffset (Vector3) [READWRITE, PERSIST] */
  maxOffset = (_init_extra_minOffset(this), _init_maxOffset(this, vec3.create()));

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  consistentRandom = (_init_extra_maxOffset(this), _init_consistentRandom(this, false));

  /** m_uniformOffset (bool) [READWRITE, PERSIST] */
  uniformOffset = (_init_extra_consistentRandom(this), _init_uniformOffset(this, false));

  /**
   * Reseeds the random stream from the wall clock, so offsets differ between
   * runs unless consistentRandom pins them to the placement id.
   */
  Initialize() {
    this.#timeSeed = Date.now() >>> 0;
    return true;
  }

  /**
   * Adds a random offset between minOffset and maxOffset - drawn per axis, or
   * with one shared factor when uniformOffset is set - to the placement's
   * initial translation, rotated into the placement's initial orientation first.
   */
  ProcessSpawnModifier(placement, _numPlacements) {
    const seed = getDistributionSeed(placement.uniqueID, this.#timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const offset = vec3.create();
    if (this.uniformOffset) {
      vec3.lerp(offset, this.minOffset, this.maxOffset, random());
    } else {
      for (let axis = 0; axis < 3; axis++) {
        offset[axis] = this.minOffset[axis] + (this.maxOffset[axis] - this.minOffset[axis]) * random();
      }
    }
    vec3.transformQuat(offset, offset, placement.initialRotation);
    vec3.add(placement.initialTranslation, placement.initialTranslation, offset);
  }
  static {
    _initClass();
  }
}

export { _EveDistributionSpawn as EveDistributionSpawnModifierRandomOffset };
//# sourceMappingURL=EveDistributionSpawnModifierRandomOffset.js.map
