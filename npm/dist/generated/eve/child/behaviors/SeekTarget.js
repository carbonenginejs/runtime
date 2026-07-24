import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { EveLocatorSets as _EveLocatorSets } from '../../../../eve/locator/EveLocatorSets.js';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_distFromOrigin, _init_extra_distFromOrigin, _init_arrivedRadius, _init_extra_arrivedRadius, _init_slowDownRadius, _init_extra_slowDownRadius, _init_target, _init_extra_target, _init_firstSpawnAtRandomPlaces, _init_extra_firstSpawnAtRandomPlaces, _init_onFirstDroneArrivedCallback, _init_extra_onFirstDroneArrivedCallback, _init_totalRepairTime, _init_extra_totalRepairTime, _init_secondsToTurn, _init_extra_secondsToTurn, _init_locatorSetName, _init_extra_locatorSetName, _init_locatorSet, _init_extra_locatorSet, _init_exit, _init_extra_exit, _init_repair, _init_extra_repair, _init_enabled, _init_extra_enabled;

/** SeekTarget (eve/child/behaviors) - generated from schema shapeHash fb9a8388.... */
let _SeekTarget;
class SeekTarget extends CjsModel {
  static {
    ({
      e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_distFromOrigin, _init_extra_distFromOrigin, _init_arrivedRadius, _init_extra_arrivedRadius, _init_slowDownRadius, _init_extra_slowDownRadius, _init_target, _init_extra_target, _init_firstSpawnAtRandomPlaces, _init_extra_firstSpawnAtRandomPlaces, _init_onFirstDroneArrivedCallback, _init_extra_onFirstDroneArrivedCallback, _init_totalRepairTime, _init_extra_totalRepairTime, _init_secondsToTurn, _init_extra_secondsToTurn, _init_locatorSetName, _init_extra_locatorSetName, _init_locatorSet, _init_extra_locatorSet, _init_exit, _init_extra_exit, _init_repair, _init_extra_repair, _init_enabled, _init_extra_enabled, _initProto],
      c: [_SeekTarget, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SeekTarget",
      family: "eve/child/behaviors"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "behaviorPriority"], [[io, io.persist, type, type.float32], 16, "behaviorWeight"], [[io, io.persist, type, type.float32], 16, "distFromOrigin"], [[io, io.persist, type, type.float32], 16, "arrivedRadius"], [[io, io.persist, type, type.float32], 16, "slowDownRadius"], [[io, io.persist, void 0, type.model("EveSpaceObject2")], 16, "target"], [[io, io.persist, type, type.boolean], 16, "firstSpawnAtRandomPlaces"], [[io, io.readwrite, void 0, type.rawStruct("BlueScriptCallback")], 16, "onFirstDroneArrivedCallback"], [[io, io.readwrite, type, type.float32], 16, "totalRepairTime"], [[io, io.readwrite, type, type.float32], 16, "secondsToTurn"], [[io, io.persist, type, type.string], 16, "locatorSetName"], [[io, io.persist, void 0, type.model("EveLocatorSets")], 16, "locatorSet"], [[io, io.readwrite, type, type.boolean], 16, "exit"], [[io, io.readwrite, type, type.boolean], 16, "repair"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddLocatorSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTarget"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetBehavior"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetBehaviorWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetExit"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTotalRepairTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetupShipRepair"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses EveSpaceObject2's portable bounds and locator query methods, and safely handles equal or degenerate box dimensions.")], 18, "SplitBoundingBox"], [[impl, impl.implemented], 18, "GetLocatorBucketIndices"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_enabled(this);
  }
  #counter = (_initProto(this), 0);
  #doneRepairing = true;
  #droneArrived = false;
  #boundingBoxes = [];
  #locatorBucketIndices = [];
  #sortedLocators = false;

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  behaviorPriority = _init_behaviorPriority(this, 0);

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  behaviorWeight = (_init_extra_behaviorPriority(this), _init_behaviorWeight(this, 1200));

  /** m_distFromOrigin (float) [READWRITE, PERSIST] */
  distFromOrigin = (_init_extra_behaviorWeight(this), _init_distFromOrigin(this, 10));

  /** m_arrivedRadius (float) [READWRITE, PERSIST] */
  arrivedRadius = (_init_extra_distFromOrigin(this), _init_arrivedRadius(this, 10));

  /** m_slowDownRadius (float) [READWRITE, PERSIST] */
  slowDownRadius = (_init_extra_arrivedRadius(this), _init_slowDownRadius(this, 33));

  /** m_target (EveSpaceObject2*) [READWRITE, PERSIST] */
  target = (_init_extra_slowDownRadius(this), _init_target(this, null));

  /** m_firstSpawnAtRandomPlaces (bool) [READWRITE, PERSIST] */
  firstSpawnAtRandomPlaces = (_init_extra_target(this), _init_firstSpawnAtRandomPlaces(this, false));

  /** m_onFirstDroneArrivedCallback (BlueScriptCallback) [READWRITE] */
  onFirstDroneArrivedCallback = (_init_extra_firstSpawnAtRandomPlaces(this), _init_onFirstDroneArrivedCallback(this, null));

  /** m_totalRepairTime (float) [READWRITE] */
  totalRepairTime = (_init_extra_onFirstDroneArrivedCallback(this), _init_totalRepairTime(this, -1));

  /** m_seconds (float) [READWRITE] */
  secondsToTurn = (_init_extra_totalRepairTime(this), _init_secondsToTurn(this, 0.35));

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST] */
  locatorSetName = (_init_extra_secondsToTurn(this), _init_locatorSetName(this, "damage"));

  /** m_locatorSet (EveLocatorSetsPtr) [READ, PERSIST] */
  locatorSet = (_init_extra_locatorSetName(this), _init_locatorSet(this, null));

  /** m_exit (bool) [READWRITE] */
  exit = (_init_extra_locatorSet(this), _init_exit(this, false));

  /** m_repair (bool) [READWRITE] */
  repair = (_init_extra_exit(this), _init_repair(this, false));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_repair(this), _init_enabled(this, true));

  /** Carbon method AddLocatorSet (MAP_METHOD_AND_WRAP). */
  AddLocatorSet() {
    const locatorSet = new _EveLocatorSets();
    locatorSet.SetName(this.locatorSetName);
    this.locatorSet = locatorSet;
  }

  /** Carbon method SetTarget (MAP_METHOD_AND_WRAP). */
  SetTarget(target) {
    this.target = target;
  }

  /** Carbon method ResetBehavior (MAP_METHOD_AND_WRAP). */
  ResetBehavior() {
    this.#counter = 0;
    this.exit = false;
    this.repair = false;
    this.#droneArrived = false;
    this.#doneRepairing = true;
  }

  /** Carbon method SetBehaviorWeight (MAP_METHOD_AND_WRAP). */
  SetBehaviorWeight(value) {
    this.behaviorWeight = value;
  }

  /** Carbon method SetExit (MAP_METHOD_AND_WRAP). */
  SetExit(value) {
    this.exit = value;
  }

  /** Carbon method SetTotalRepairTime (MAP_METHOD_AND_WRAP). */
  SetTotalRepairTime(seconds) {
    this.totalRepairTime = seconds;
  }

  /** Carbon method SetupShipRepair (MAP_METHOD_AND_WRAP). */
  SetupShipRepair() {
    this.exit = false;
    this.#droneArrived = false;
    this.repair = true;
  }

  /** Carbon method SplitBoundingBox (MAP_METHOD_AND_WRAP). */
  SplitBoundingBox() {
    this.#boundingBoxes.length = 0;
    this.#locatorBucketIndices.length = 0;
    this.#sortedLocators = false;
    if (!this.target?.GetLocalBoundingBox) {
      return false;
    }
    const min = vec3.create();
    const max = vec3.create();
    if (!this.target.GetLocalBoundingBox(min, max)) {
      return false;
    }
    const dimensions = vec3.subtract(vec3.create(), max, min);
    let maxIndex = 0;
    for (let index = 1; index < 3; index++) {
      if (dimensions[index] > dimensions[maxIndex]) {
        maxIndex = index;
      }
    }
    const largest = dimensions[maxIndex];
    if (!Number.isFinite(largest) || largest <= 0) {
      return false;
    }
    const otherDimensions = [dimensions[(maxIndex + 1) % 3], dimensions[(maxIndex + 2) % 3]];
    const secondLargest = Math.max(...otherDimensions.filter(Number.isFinite), 0);
    let desiredLength = largest;
    if (secondLargest > 0) {
      while (desiredLength > secondLargest) {
        desiredLength *= 0.5;
      }
    }
    const boxCount = secondLargest > 0 ? Math.max(1, Math.round(largest / desiredLength)) : 1;
    for (let index = 0; index < boxCount; index++) {
      const boxMin = vec3.clone(min);
      const boxMax = vec3.clone(max);
      boxMin[maxIndex] = min[maxIndex] + index * desiredLength;
      boxMax[maxIndex] = index === boxCount - 1 ? max[maxIndex] : min[maxIndex] + (index + 1) * desiredLength;
      this.#boundingBoxes.push({
        min: boxMin,
        max: boxMax
      });
      this.#locatorBucketIndices.push([]);
    }
    const locatorCount = Math.max(0, Number(this.target.GetLocatorCount?.(this.locatorSetName)) || 0);
    const position = vec3.create();
    for (let locatorIndex = 0; locatorIndex < locatorCount; locatorIndex++) {
      const locatorPosition = this.target.GetLocatorPositionFromSet?.(locatorIndex, false, this.locatorSetName, position);
      if (!locatorPosition) {
        continue;
      }
      for (let bucketIndex = 0; bucketIndex < this.#boundingBoxes.length; bucketIndex++) {
        const box = this.#boundingBoxes[bucketIndex];
        if (locatorPosition[0] >= box.min[0] && locatorPosition[0] <= box.max[0] && locatorPosition[1] >= box.min[1] && locatorPosition[1] <= box.max[1] && locatorPosition[2] >= box.min[2] && locatorPosition[2] <= box.max[2]) {
          this.#locatorBucketIndices[bucketIndex].push(locatorIndex);
          break;
        }
      }
    }
    for (let index = this.#locatorBucketIndices.length - 1; index >= 0; index--) {
      if (this.#locatorBucketIndices[index].length === 0) {
        this.#locatorBucketIndices.splice(index, 1);
        this.#boundingBoxes.splice(index, 1);
      }
    }
    this.#sortedLocators = true;
    return true;
  }
  GetLocatorBucketIndices() {
    return this.#locatorBucketIndices.map(bucket => [...bucket]);
  }
  static {
    _initClass();
  }
}

export { _SeekTarget as SeekTarget };
//# sourceMappingURL=SeekTarget.js.map
