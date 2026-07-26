// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBulletStorm.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBulletStorm.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Locator-driven bullet-storm child: instances, target blobs, and the clip-sphere state machine. */
@type.define({ className: "EveChildBulletStorm", family: "eve/child" })
export class EveChildBulletStorm extends CjsModel
{

  #changingClipSphere = false;

  #clipSphereMultiplier = 0;

  @type.list("EveChildBulletStormInstance")
  instances = [];

  @type.array("vec4")
  targetBlobs = [];

  @type.mat4
  worldTransform = mat4.create();

  /** m_targetObjects (PIEveSpaceObject2Vector) [READ, NOTIFY] */
  @io.notify
  @io.read
  @type.list("IEveSpaceObject2")
  targetObjects = [];

  /** m_objectCount (unsigned int) [READ] */
  @io.read
  @type.uint32
  objectCount = 0;

  /** m_clipSphere (float) [READ] */
  @io.read
  @type.float32
  clipSphere = 1;

  /** m_sourceRadius (float) [READ] */
  @io.read
  @type.float32
  sourceRadius = 0;

  /** m_sourceObject (EveSpaceObject2Ptr) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.objectRef("EveSpaceObject2")
  sourceObject = null;

  /** m_multiplier (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.uint32
  multiplier = 1;

  /** m_speed (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  speed = 1000;

  /** m_sourceLocatorSet (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  sourceLocatorSet = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_range (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  range = 1000;

  /** m_display (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  display = true;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  effect = null;

  /** Carbon method CanChangeState (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  CanChangeState()
  {
    return !this.#changingClipSphere;
  }

  /** Carbon method Rebuild (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Rebuild()
  {
    this.instances.length = 0;
    this.objectCount = 0;
    if (!this.sourceObject) return false;
    const locators = this.sourceObject.GetLocatorsForSet?.(this.sourceLocatorSet)
      ?? this.sourceObject.locatorSets?.find(set => set?.HasName?.(this.sourceLocatorSet) || set?.name === this.sourceLocatorSet)?.GetLocators?.()
      ?? this.sourceObject.locatorSets?.find(set => set?.name === this.sourceLocatorSet)?.locators;
    if (!locators) return false;
    const count = Math.max(0, Number(this.multiplier) >>> 0);
    for (const locator of locators)
    {
      const direction = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), locator.direction);
      const randomOffset = Math.random();
      for (let i = 0; i < count; i++)
      {
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
  @carbon.method
  @impl.implemented
  StartEffect()
  {
    this.#clipSphereMultiplier = 1;
    this.clipSphere = 0;
    this.#changingClipSphere = true;
  }

  /** Carbon method StopEffect (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StopEffect()
  {
    this.#clipSphereMultiplier = -1;
    this.clipSphere = 0;
    this.#changingClipSphere = true;
  }

  /** Carbon EveChildBulletStorm::HasTransparentBatches is always false. */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveChildBulletStorm::GetSortValue is the constant zero. */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Carbon EveChildBulletStorm::GetBatches submits the instanced storm geometry (GPU-backed). */
  @carbon.method
  @impl.notImplemented
  GetBatches(_accumulator, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveChildBulletStorm.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveChildBulletStorm::GetPerObjectData (cpp:393-410): transposed
   * world (Set(MATRIX) does it), effectInfo = (targetObjects.length,
   * sourceRadius + range, clipSphere, speed), then targetPositionsWS[i] per
   * target blob. Slots past targetBlobs.length are NEVER written - the
   * per-element writes keep Carbon's arena-garbage tail. VS-only payload. */
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveChildBulletStormPerObjectData");

    data.Set("worldTransform", this.worldTransform);
    data.Set("effectInfo", [
      this.targetObjects.length,
      this.sourceRadius + this.range,
      this.clipSphere,
      this.speed
    ]);

    for (let index = 0; index < this.targetBlobs.length; index++)
    {
      data.Set("targetPositionsWS", this.targetBlobs[index], index);
    }

    return data;
  }

  @impl.adapted
  UpdateAsyncronous(updateContext, params = {})
  {
    params.spaceObjectParent?.GetLocalToWorldTransform?.(this.worldTransform);
    this.targetBlobs.length = 0;
    for (const target of this.targetObjects.slice(0, 10))
    {
      const position = vec3.clone(target.modelWorldPosition ?? vec3.create());
      const positionResult = target.GetModelCenterWorldPosition?.(position);
      if (positionResult?.length >= 3) vec3.copy(position, positionResult);
      const sphere = vec4.create();
      const hasSphere = target.GetBoundingSphere?.(sphere);
      this.targetBlobs.push(vec4.fromValues(position[0], position[1], position[2], Math.max(hasSphere === false ? 0 : sphere[3], 4050)));
    }
    if (this.sourceObject)
    {
      const sphere = vec4.create();
      if (this.sourceObject.GetBoundingSphere?.(sphere)) this.sourceRadius = sphere[3];
    }
    if (this.#changingClipSphere)
    {
      const deltaTime = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaTime ?? 0);
      const denominator = this.sourceRadius + this.range;
      if (denominator) this.clipSphere += this.#clipSphereMultiplier * this.speed * deltaTime / denominator;
      this.clipSphere = Math.max(-1, Math.min(1, this.clipSphere));
      this.#changingClipSphere = Math.abs(this.clipSphere) !== 1;
    }
  }

}
