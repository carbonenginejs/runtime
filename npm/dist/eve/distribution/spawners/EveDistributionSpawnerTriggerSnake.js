import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_minBaseTimeBetweenTriggers, _init_extra_minBaseTimeBetweenTriggers, _init_maxBaseTimeBetweenTriggers, _init_extra_maxBaseTimeBetweenTriggers, _init_travelProgress, _init_extra_travelProgress, _init_destinationsReached, _init_extra_destinationsReached, _init_totalDestinations, _init_extra_totalDestinations, _init_distanceToTravelTimeMultiplier, _init_extra_distanceToTravelTimeMultiplier;

/** EveDistributionSpawnerTriggerSnake (eve/distribution/spawners) - generated from schema shapeHash e942dd2e.... */
let _EveDistributionSpawn;
class EveDistributionSpawnerTriggerSnake extends CjsModel {
  static {
    ({
      e: [_init_minBaseTimeBetweenTriggers, _init_extra_minBaseTimeBetweenTriggers, _init_maxBaseTimeBetweenTriggers, _init_extra_maxBaseTimeBetweenTriggers, _init_travelProgress, _init_extra_travelProgress, _init_destinationsReached, _init_extra_destinationsReached, _init_totalDestinations, _init_extra_totalDestinations, _init_distanceToTravelTimeMultiplier, _init_extra_distanceToTravelTimeMultiplier, _initProto],
      c: [_EveDistributionSpawn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionSpawnerTriggerSnake",
      family: "eve/distribution/spawners"
    })], [[[io, io.persist, type, type.float32], 16, "minBaseTimeBetweenTriggers"], [[io, io.persist, type, type.float32], 16, "maxBaseTimeBetweenTriggers"], [[io, io.read, type, type.float32], 16, "travelProgress"], [[io, io.read, type, type.int32], 16, "destinationsReached"], [[io, io.persist, type, type.int32], 16, "totalDestinations"], [[io, io.persist, type, type.float32], 16, "distanceToTravelTimeMultiplier"], [[carbon, carbon.method, impl, impl.adapted], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "Restart"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "SetControllerVariable"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_distanceToTravelTimeMultiplier(this);
  }
  #activeTargetUniqueID = (_initProto(this), 0);
  #targetPoint = vec3.create();
  #lastTarget = vec3.create();
  #currentTravelTime = 0;
  #travelDurationToNextPoint = 1;

  /** m_minTimeBetweenTriggers (float) [READWRITE, PERSIST] */
  minBaseTimeBetweenTriggers = _init_minBaseTimeBetweenTriggers(this, 1);

  /** m_maxTimeBetweenTriggers (float) [READWRITE, PERSIST] */
  maxBaseTimeBetweenTriggers = (_init_extra_minBaseTimeBetweenTriggers(this), _init_maxBaseTimeBetweenTriggers(this, 1));

  /** m_travelProgress (float) [READ] */
  travelProgress = (_init_extra_maxBaseTimeBetweenTriggers(this), _init_travelProgress(this, 1));

  /** m_numDestinationsReached (int32_t) [READ] */
  destinationsReached = (_init_extra_travelProgress(this), _init_destinationsReached(this, 0));

  /** m_totalDestinations (int32_t) [READWRITE, PERSIST] */
  totalDestinations = (_init_extra_destinationsReached(this), _init_totalDestinations(this, 5));

  /** m_distanceToTravelTimeMultiplier (float) [READWRITE, PERSIST] */
  distanceToTravelTimeMultiplier = (_init_extra_totalDestinations(this), _init_distanceToTravelTimeMultiplier(this, 0));
  Reset(placements) {
    if (placements.length === 0) {
      return;
    }
    const index = Math.floor(Math.random() * placements.length);
    const placement = placements[index].placement;
    vec3.copy(this.#targetPoint, placement.initialTranslation);
    vec3.copy(this.#lastTarget, this.#targetPoint);
    this.#activeTargetUniqueID = placement.uniqueID;
    this.Restart();
  }
  Restart() {
    this.destinationsReached = -1;
    this.#currentTravelTime = 0;
    this.#travelDurationToNextPoint = 0;
  }
  UpdateSyncronous(updateContext, _params, owner) {
    if (this.destinationsReached >= this.totalDestinations && this.totalDestinations !== -1) {
      return;
    }
    this.#currentTravelTime += updateContext.GetDeltaT();
    this.travelProgress = this.#travelDurationToNextPoint > 0 ? this.#currentTravelTime / this.#travelDurationToNextPoint : 1;
    if (this.travelProgress < 1) {
      return;
    }
    owner.TriggerEntityByID(this.#activeTargetUniqueID);
    this.#currentTravelTime = 0;
    this.travelProgress = 0;
    this.destinationsReached++;
    this.#travelDurationToNextPoint = this.minBaseTimeBetweenTriggers + (this.maxBaseTimeBetweenTriggers - this.minBaseTimeBetweenTriggers) * Math.random();
    const searchPoint = vec3.lerp(vec3.create(), this.#lastTarget, this.#targetPoint, 1.3);
    const closestPlacement = owner.GetClosestFreePlacement(searchPoint);
    if (closestPlacement === -1) {
      return;
    }
    const placement = owner.GetInitialPlacementData(closestPlacement);
    if (placement) {
      vec3.copy(this.#lastTarget, this.#targetPoint);
      this.#activeTargetUniqueID = placement.uniqueID;
      vec3.copy(this.#targetPoint, placement.initialTranslation);
      this.#travelDurationToNextPoint += vec3.distance(this.#targetPoint, this.#lastTarget) * this.distanceToTravelTimeMultiplier / 100;
    }
  }
  SetControllerVariable(_name, _value) {}
  static {
    _initClass();
  }
}

export { _EveDistributionSpawn as EveDistributionSpawnerTriggerSnake };
//# sourceMappingURL=EveDistributionSpawnerTriggerSnake.js.map
