import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_delayBetweenRepeats, _init_extra_delayBetweenRepeats, _init_numberOfRepeats, _init_extra_numberOfRepeats, _init_useRandomStartOffset, _init_extra_useRandomStartOffset, _init_maxRandomizedIntervalDelta, _init_extra_maxRandomizedIntervalDelta, _init_delayBeforeInitialSpawn, _init_extra_delayBeforeInitialSpawn;

/** EveDistributionSpawnerInterval (eve/distribution/spawners) - generated from schema shapeHash b44c191b.... */
let _EveDistributionSpawn;
class EveDistributionSpawnerInterval extends CjsModel {
  static {
    ({
      e: [_init_delayBetweenRepeats, _init_extra_delayBetweenRepeats, _init_numberOfRepeats, _init_extra_numberOfRepeats, _init_useRandomStartOffset, _init_extra_useRandomStartOffset, _init_maxRandomizedIntervalDelta, _init_extra_maxRandomizedIntervalDelta, _init_delayBeforeInitialSpawn, _init_extra_delayBeforeInitialSpawn, _initProto],
      c: [_EveDistributionSpawn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionSpawnerInterval",
      family: "eve/distribution/spawners"
    })], [[[io, io.persist, type, type.float32], 16, "delayBetweenRepeats"], [[io, io.persist, type, type.uint32], 16, "numberOfRepeats"], [[io, io.persist, type, type.boolean], 16, "useRandomStartOffset"], [[io, io.persist, type, type.float32], 16, "maxRandomizedIntervalDelta"], [[io, io.persist, type, type.float32], 16, "delayBeforeInitialSpawn"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.adapted], 18, "Restart"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_delayBeforeInitialSpawn(this);
  }
  #localTimer = (_initProto(this), 0);
  #numTriggered = 0;

  /** m_delayBetweenRepeats (float) [READWRITE, PERSIST] */
  delayBetweenRepeats = _init_delayBetweenRepeats(this, 1);

  /** m_numberOfTriggers (uint32_t) [READWRITE, PERSIST] */
  numberOfRepeats = (_init_extra_delayBetweenRepeats(this), _init_numberOfRepeats(this, 0));

  /** m_useRandomStartOffset (bool) [READWRITE, PERSIST] */
  useRandomStartOffset = (_init_extra_numberOfRepeats(this), _init_useRandomStartOffset(this, true));

  /** m_maxRandomizedIntervalDelta (float) [READWRITE, PERSIST] */
  maxRandomizedIntervalDelta = (_init_extra_useRandomStartOffset(this), _init_maxRandomizedIntervalDelta(this, 0));

  /** m_delayBeforeInitialSpawn (float) [READWRITE, PERSIST] */
  delayBeforeInitialSpawn = (_init_extra_maxRandomizedIntervalDelta(this), _init_delayBeforeInitialSpawn(this, 0));

  /** Restarts the interval timer; the placement pool is not used by this spawner. */
  Reset(_placements) {
    this.Restart();
  }

  /**
   * Rearms the interval and clears the repeat count, optionally starting at a
   * random point inside one interval and backing the timer off by the initial
   * spawn delay.
   */
  Restart() {
    this.#localTimer = this.useRandomStartOffset ? Math.random() * this.delayBetweenRepeats : 0;
    this.#localTimer -= this.delayBeforeInitialSpawn;
    this.#numTriggered = 0;
  }

  /**
   * Spawns one entity each time the timer passes the repeat delay, up to
   * numberOfRepeats (unlimited when it is zero), reseeding the timer with a
   * randomized interval delta.
   */
  UpdateSyncronous(updateContext, _params, owner) {
    if (this.numberOfRepeats !== 0 && this.#numTriggered >= this.numberOfRepeats) {
      return;
    }
    this.#localTimer += updateContext.GetDeltaT();
    if (this.#localTimer > this.delayBetweenRepeats) {
      owner.AddEntities(1);
      this.#numTriggered++;
      this.#localTimer = this.maxRandomizedIntervalDelta - 2 * Math.random() * this.maxRandomizedIntervalDelta;
    }
  }

  /** Ignores controller variables; the interval is purely time-driven. */
  SetControllerVariable(_name, _value) {}
  static {
    _initClass();
  }
}

export { _EveDistributionSpawn as EveDistributionSpawnerInterval };
//# sourceMappingURL=EveDistributionSpawnerInterval.js.map
