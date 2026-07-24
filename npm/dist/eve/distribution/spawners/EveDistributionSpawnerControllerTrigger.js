import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_variableName, _init_extra_variableName, _init_value, _init_extra_value, _init_invertTrigger, _init_extra_invertTrigger, _init_isActive, _init_extra_isActive, _init_spawners, _init_extra_spawners, _init_restartOnReceivingValue, _init_extra_restartOnReceivingValue;

/** EveDistributionSpawnerControllerTrigger (eve/distribution/spawners) - generated from schema shapeHash 67110969.... */
let _EveDistributionSpawn;
class EveDistributionSpawnerControllerTrigger extends CjsModel {
  static {
    ({
      e: [_init_variableName, _init_extra_variableName, _init_value, _init_extra_value, _init_invertTrigger, _init_extra_invertTrigger, _init_isActive, _init_extra_isActive, _init_spawners, _init_extra_spawners, _init_restartOnReceivingValue, _init_extra_restartOnReceivingValue, _initProto],
      c: [_EveDistributionSpawn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionSpawnerControllerTrigger",
      family: "eve/distribution/spawners"
    })], [[[io, io.persist, type, type.string], 16, "variableName"], [[io, io.persist, type, type.float32], 16, "value"], [[io, io.persist, type, type.boolean], 16, "invertTrigger"], [[io, io.read, type, type.boolean], 16, "isActive"], [[io, io.persist, void 0, type.list("IEveDistributionSpawner")], 16, "spawners"], [[io, io.persist, type, type.boolean], 16, "restartOnReceivingValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "Restart"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_restartOnReceivingValue(this);
  }
  /** m_variableName (std::string) [READWRITE, PERSIST] */
  variableName = (_initProto(this), _init_variableName(this, ""));

  /** m_value (float) [READWRITE, PERSIST] */
  value = (_init_extra_variableName(this), _init_value(this, 0));

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST] */
  invertTrigger = (_init_extra_value(this), _init_invertTrigger(this, false));

  /** m_isActive (bool) [READ] */
  isActive = (_init_extra_invertTrigger(this), _init_isActive(this, false));

  /** m_distributionSpawners (PIEveDistributionSpawnerVector) [READ, PERSIST] */
  spawners = (_init_extra_isActive(this), _init_spawners(this, []));

  /** m_restartOnReceivingValue (bool) [READWRITE, PERSIST] */
  restartOnReceivingValue = (_init_extra_spawners(this), _init_restartOnReceivingValue(this, false));
  Reset(_placements) {
    this.Restart();
  }
  Restart() {
    for (const spawner of this.spawners) {
      spawner.Restart();
    }
  }
  OnModified(name) {
    if (name === "value") {
      this.#applyValue();
    }
    return true;
  }
  UpdateSyncronous(updateContext, params, owner) {
    if (!this.isActive) {
      return;
    }
    for (const spawner of this.spawners) {
      spawner.UpdateSyncronous(updateContext, params, owner);
    }
  }
  SetControllerVariable(name, value) {
    if (this.variableName !== name) {
      return;
    }
    this.value = value;
    this.#applyValue();
  }
  #applyValue() {
    if (this.restartOnReceivingValue) {
      this.Restart();
    }
    this.isActive = this.invertTrigger ? 1 - this.value > 0 : this.value > 0;
  }
  static {
    _initClass();
  }
}

export { _EveDistributionSpawn as EveDistributionSpawnerControllerTrigger };
//# sourceMappingURL=EveDistributionSpawnerControllerTrigger.js.map
