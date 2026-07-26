import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_instances, _init_extra_instances, _init_targetBlobs, _init_extra_targetBlobs, _init_worldTransform, _init_extra_worldTransform, _init_targetObjects, _init_extra_targetObjects, _init_objectCount, _init_extra_objectCount, _init_clipSphere, _init_extra_clipSphere, _init_sourceRadius, _init_extra_sourceRadius, _init_sourceObject, _init_extra_sourceObject, _init_multiplier, _init_extra_multiplier, _init_speed, _init_extra_speed, _init_sourceLocatorSet, _init_extra_sourceLocatorSet, _init_name, _init_extra_name, _init_range, _init_extra_range, _init_display, _init_extra_display, _init_effect, _init_extra_effect;

/** Locator-driven bullet-storm child: instances, target blobs, and the clip-sphere state machine. */
let _EveChildBulletStorm;
class EveChildBulletStorm extends CjsModel {
  static {
    ({
      e: [_init_instances, _init_extra_instances, _init_targetBlobs, _init_extra_targetBlobs, _init_worldTransform, _init_extra_worldTransform, _init_targetObjects, _init_extra_targetObjects, _init_objectCount, _init_extra_objectCount, _init_clipSphere, _init_extra_clipSphere, _init_sourceRadius, _init_extra_sourceRadius, _init_sourceObject, _init_extra_sourceObject, _init_multiplier, _init_extra_multiplier, _init_speed, _init_extra_speed, _init_sourceLocatorSet, _init_extra_sourceLocatorSet, _init_name, _init_extra_name, _init_range, _init_extra_range, _init_display, _init_extra_display, _init_effect, _init_extra_effect, _initProto],
      c: [_EveChildBulletStorm, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildBulletStorm",
      family: "eve/child"
    })], [[type.list("EveChildBulletStormInstance"), 0, "instances"], [type.array("vec4"), 0, "targetBlobs"], [[type, type.mat4], 16, "worldTransform"], [[io, io.notify, io, io.read, void 0, type.list("IEveSpaceObject2")], 16, "targetObjects"], [[io, io.read, type, type.uint32], 16, "objectCount"], [[io, io.read, type, type.float32], 16, "clipSphere"], [[io, io.read, type, type.float32], 16, "sourceRadius"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("EveSpaceObject2")], 16, "sourceObject"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "multiplier"], [[io, io.notify, io, io.persist, type, type.float32], 16, "speed"], [[io, io.notify, io, io.persist, type, type.string], 16, "sourceLocatorSet"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "range"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "effect"], [[carbon, carbon.method, impl, impl.implemented], 18, "CanChangeState"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"], [[impl, impl.adapted], 18, "UpdateAsyncronous"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_effect(this);
  }
  #changingClipSphere = (_initProto(this), false);
  #clipSphereMultiplier = 0;
  instances = _init_instances(this, []);
  targetBlobs = (_init_extra_instances(this), _init_targetBlobs(this, []));
  worldTransform = (_init_extra_targetBlobs(this), _init_worldTransform(this, mat4.create()));

  /** m_targetObjects (PIEveSpaceObject2Vector) [READ, NOTIFY] */
  targetObjects = (_init_extra_worldTransform(this), _init_targetObjects(this, []));

  /** m_objectCount (unsigned int) [READ] */
  objectCount = (_init_extra_targetObjects(this), _init_objectCount(this, 0));

  /** m_clipSphere (float) [READ] */
  clipSphere = (_init_extra_objectCount(this), _init_clipSphere(this, 1));

  /** m_sourceRadius (float) [READ] */
  sourceRadius = (_init_extra_clipSphere(this), _init_sourceRadius(this, 0));

  /** m_sourceObject (EveSpaceObject2Ptr) [READWRITE, NOTIFY] */
  sourceObject = (_init_extra_sourceRadius(this), _init_sourceObject(this, null));

  /** m_multiplier (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  multiplier = (_init_extra_sourceObject(this), _init_multiplier(this, 1));

  /** m_speed (float) [READWRITE, PERSIST, NOTIFY] */
  speed = (_init_extra_multiplier(this), _init_speed(this, 1000));

  /** m_sourceLocatorSet (std::string) [READWRITE, PERSIST, NOTIFY] */
  sourceLocatorSet = (_init_extra_speed(this), _init_sourceLocatorSet(this, ""));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_sourceLocatorSet(this), _init_name(this, ""));

  /** m_range (float) [READWRITE, PERSIST] */
  range = (_init_extra_name(this), _init_range(this, 1000));

  /** m_display (bool) [READWRITE] */
  display = (_init_extra_range(this), _init_display(this, true));

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  effect = (_init_extra_display(this), _init_effect(this, null));

  /** Carbon method CanChangeState (MAP_METHOD_AND_WRAP). */
  CanChangeState() {
    return !this.#changingClipSphere;
  }

  /** Carbon method Rebuild (MAP_METHOD_AND_WRAP). */
  Rebuild() {
    this.instances.length = 0;
    this.objectCount = 0;
    if (!this.sourceObject) return false;
    const locators = this.sourceObject.GetLocatorsForSet?.(this.sourceLocatorSet) ?? this.sourceObject.locatorSets?.find(set => set?.HasName?.(this.sourceLocatorSet) || set?.name === this.sourceLocatorSet)?.GetLocators?.() ?? this.sourceObject.locatorSets?.find(set => set?.name === this.sourceLocatorSet)?.locators;
    if (!locators) return false;
    const count = Math.max(0, Number(this.multiplier) >>> 0);
    for (const locator of locators) {
      const direction = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), locator.direction);
      const randomOffset = Math.random();
      for (let i = 0; i < count; i++) {
        this.instances.push({
          sourcePositionOS: vec3.clone(locator.position),
          sourceDirectionOS: vec3.clone(direction),
          data: vec4.fromValues(Math.random(), Math.random(), Math.random(), (i + randomOffset) / count)
        });
      }
    }
    this.objectCount = this.instances.length;
    return true;
  }

  /** Carbon method StartEffect (MAP_METHOD_AND_WRAP). */
  StartEffect() {
    this.#clipSphereMultiplier = 1;
    this.clipSphere = 0;
    this.#changingClipSphere = true;
  }

  /** Carbon method StopEffect (MAP_METHOD_AND_WRAP). */
  StopEffect() {
    this.#clipSphereMultiplier = -1;
    this.clipSphere = 0;
    this.#changingClipSphere = true;
  }

  /** Carbon EveChildBulletStorm::HasTransparentBatches is always false. */
  HasTransparentBatches() {
    return false;
  }

  /** Carbon EveChildBulletStorm::GetSortValue is the constant zero. */
  GetSortValue() {
    return 0;
  }

  /** Carbon EveChildBulletStorm::GetBatches submits the instanced storm geometry (GPU-backed). */
  GetBatches(_accumulator, _batchType, _perObjectData, _reason) {
    throw new Error("EveChildBulletStorm.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveChildBulletStorm::GetPerObjectData (cpp:393-410): transposed
   * world (Set(MATRIX) does it), effectInfo = (targetObjects.length,
   * sourceRadius + range, clipSphere, speed), then targetPositionsWS[i] per
   * target blob. Slots past targetBlobs.length are NEVER written - the
   * per-element writes keep Carbon's arena-garbage tail. VS-only payload. */
  GetPerObjectData(accumulator) {
    const data = accumulator.Alloc("EveChildBulletStormPerObjectData");
    data.Set("worldTransform", this.worldTransform);
    data.Set("effectInfo", [this.targetObjects.length, this.sourceRadius + this.range, this.clipSphere, this.speed]);
    for (let index = 0; index < this.targetBlobs.length; index++) {
      data.Set("targetPositionsWS", this.targetBlobs[index], index);
    }
    return data;
  }

  /**
   * Re-reads the world transform from the owning space object, rebuilds the
   * world-space target blobs for up to the first ten targets (each blob radius
   * floored at 4050), refreshes the source object's radius, and - while the clip
   * sphere is still animating - advances it at the storm's travel speed over the
   * total reach, clamped to -1..1.
   */
  UpdateAsyncronous(updateContext, params = {}) {
    params.spaceObjectParent?.GetLocalToWorldTransform?.(this.worldTransform);
    this.targetBlobs.length = 0;
    for (const target of this.targetObjects.slice(0, 10)) {
      const position = vec3.clone(target.modelWorldPosition ?? vec3.create());
      const positionResult = target.GetModelCenterWorldPosition?.(position);
      if (positionResult?.length >= 3) vec3.copy(position, positionResult);
      const sphere = vec4.create();
      const hasSphere = target.GetBoundingSphere?.(sphere);
      this.targetBlobs.push(vec4.fromValues(position[0], position[1], position[2], Math.max(hasSphere === false ? 0 : sphere[3], 4050)));
    }
    if (this.sourceObject) {
      const sphere = vec4.create();
      if (this.sourceObject.GetBoundingSphere?.(sphere)) this.sourceRadius = sphere[3];
    }
    if (this.#changingClipSphere) {
      const deltaTime = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaTime ?? 0);
      const denominator = this.sourceRadius + this.range;
      if (denominator) this.clipSphere += this.#clipSphereMultiplier * this.speed * deltaTime / denominator;
      this.clipSphere = Math.max(-1, Math.min(1, this.clipSphere));
      this.#changingClipSphere = Math.abs(this.clipSphere) !== 1;
    }
  }
  static {
    _initClass();
  }
}

export { _EveChildBulletStorm as EveChildBulletStorm };
//# sourceMappingURL=EveChildBulletStorm.js.map
