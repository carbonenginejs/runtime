// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBulletStorm.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBulletStorm.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";
import { INotify, IsMatch } from "#blue";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";

/** Locator-driven bullet-storm child: instances, target blobs, and the clip-sphere state machine. */
@meta.define({ className: "EveChildBulletStorm", family: "eve/child" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.mapInterface(INotify)
export class EveChildBulletStorm extends EveSpaceObjectChild
{

  /** Carbon EveChildBulletStorm.cpp:70: only instance-source edits rebuild the swarm. */
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "multiplier") || IsMatch(names, "sourceObject") || IsMatch(names, "sourceLocatorSet"))
      this.Rebuild();
    return true;
  }


  _changingClipSphere = false;

  _clipSphereMultiplier = 0;

  @meta.type.list("EveChildBulletStormInstance")
  instances = [];

  @meta.type.array("vec4")
  targetBlobs = [];

  @meta.type.mat4
  worldTransform = mat4.create();

  /** m_targetObjects (PIEveSpaceObject2Vector) [READ, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.type.list("IEveSpaceObject2")
  targetObjects = [];

  /** m_objectCount (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  objectCount = 0;

  /** m_clipSphere (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  clipSphere = 1;

  /** m_sourceRadius (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  sourceRadius = 0;

  /** m_sourceObject (EveSpaceObject2Ptr) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.objectRef("EveSpaceObject2")
  sourceObject = null;

  /** m_multiplier (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  multiplier = 1;

  /** m_speed (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  speed = 1000;

  /** m_sourceLocatorSet (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  sourceLocatorSet = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_range (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  range = 1000;

  /** m_display (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  effect = null;

  /** Carbon method CanChangeState (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  CanChangeState()
  {
    return !this._changingClipSphere;
  }

  /** Carbon method Rebuild (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.implemented
  StartEffect()
  {
    this._clipSphereMultiplier = 1;
    this.clipSphere = 0;
    this._changingClipSphere = true;
  }

  /** Carbon method StopEffect (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  StopEffect()
  {
    this._clipSphereMultiplier = -1;
    this.clipSphere = 0;
    this._changingClipSphere = true;
  }

  /** Carbon EveChildBulletStorm::HasTransparentBatches is always false. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveChildBulletStorm::GetSortValue is the constant zero. */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Carbon EveChildBulletStorm::GetBatches submits the instanced storm geometry (GPU-backed). */
  @meta.blue.method
  @meta.notImplemented
  GetBatches(_accumulator, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveChildBulletStorm.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveChildBulletStorm::GetPerObjectData (cpp:393-410): transposed
   * world (Set(MATRIX) does it), effectInfo = (targetObjects.length,
   * sourceRadius + range, clipSphere, speed), then targetPositionsWS[i] per
   * target blob. Slots past targetBlobs.length are NEVER written - the
   * per-element writes keep Carbon's arena-garbage tail. VS-only payload. */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveChildBulletStormPerObjectData");

    data.SetAndTranspose("worldTransform", this.worldTransform);
    data.Set("effectInfo", [
      this.targetObjects.length,
      this.sourceRadius + this.range,
      this.clipSphere,
      this.speed
    ]);

    for (let index = 0; index < this.targetBlobs.length; index++)
    {
      data.SetIndex("targetPositionsWS", index, this.targetBlobs[index]);
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
  @meta.adapted
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
      if (this.sourceObject.GetBoundingSphere(sphere)) this.sourceRadius = sphere[3];
    }
    if (this._changingClipSphere)
    {
      const deltaTime = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaTime ?? 0);
      const denominator = this.sourceRadius + this.range;
      if (denominator) this.clipSphere += this._clipSphereMultiplier * this.speed * deltaTime / denominator;
      this.clipSphere = Math.max(-1, Math.min(1, this.clipSphere));
      this._changingClipSphere = Math.abs(this.clipSphere) !== 1;
    }
  }

}
