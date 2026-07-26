import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { getDistributionSeed, createMinStdRandom } from '../../CjsDistributionRandom.js';

let _initProto, _initClass, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_consistentRandom, _init_extra_consistentRandom, _init_uniformScale, _init_extra_uniformScale, _init_overrideScale, _init_extra_overrideScale;

/** EveDistributionSpawnModifierRandomScale (eve/distribution/spawnModifiers) - generated from schema shapeHash 721180bc.... */
let _EveDistributionSpawn;
class EveDistributionSpawnModifierRandomScale extends CjsModel {
  static {
    ({
      e: [_init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_consistentRandom, _init_extra_consistentRandom, _init_uniformScale, _init_extra_uniformScale, _init_overrideScale, _init_extra_overrideScale, _initProto],
      c: [_EveDistributionSpawn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionSpawnModifierRandomScale",
      family: "eve/distribution/spawnModifiers"
    })], [[[io, io.persist, type, type.vec3], 16, "minScale"], [[io, io.persist, type, type.vec3], 16, "maxScale"], [[io, io.persist, type, type.boolean], 16, "consistentRandom"], [[io, io.persist, type, type.boolean], 16, "uniformScale"], [[io, io.persist, type, type.boolean], 16, "overrideScale"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "ProcessSpawnModifier"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_overrideScale(this);
  }
  #timeSeed = (_initProto(this), Date.now() >>> 0);

  /** m_minScale (Vector3) [READWRITE, PERSIST] */
  minScale = _init_minScale(this, vec3.fromValues(1, 1, 1));

  /** m_maxScale (Vector3) [READWRITE, PERSIST] */
  maxScale = (_init_extra_minScale(this), _init_maxScale(this, vec3.fromValues(1, 1, 1)));

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  consistentRandom = (_init_extra_maxScale(this), _init_consistentRandom(this, false));

  /** m_uniformScale (bool) [READWRITE, PERSIST] */
  uniformScale = (_init_extra_consistentRandom(this), _init_uniformScale(this, false));

  /** m_overrideScale (bool) [READWRITE, PERSIST] */
  overrideScale = (_init_extra_uniformScale(this), _init_overrideScale(this, false));

  /**
   * Reseeds the random stream from the wall clock, so scales differ between runs
   * unless consistentRandom pins them to the placement id.
   */
  Initialize() {
    this.#timeSeed = Date.now() >>> 0;
    return true;
  }

  /**
   * Draws a random scale between minScale and maxScale - per axis, or with one
   * shared factor when uniformScale is set - and either replaces the placement's
   * initial scale or multiplies into it.
   */
  ProcessSpawnModifier(placement, _numPlacements) {
    const seed = getDistributionSeed(placement.uniqueID, this.#timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const scale = vec3.create();
    if (this.uniformScale) {
      vec3.lerp(scale, this.minScale, this.maxScale, random());
    } else {
      for (let axis = 0; axis < 3; axis++) {
        scale[axis] = this.minScale[axis] + (this.maxScale[axis] - this.minScale[axis]) * random();
      }
    }
    if (this.overrideScale) {
      placement.initialScale.set(scale);
    } else {
      vec3.multiply(placement.initialScale, placement.initialScale, scale);
    }
  }
  static {
    _initClass();
  }
}

export { _EveDistributionSpawn as EveDistributionSpawnModifierRandomScale };
//# sourceMappingURL=EveDistributionSpawnModifierRandomScale.js.map
