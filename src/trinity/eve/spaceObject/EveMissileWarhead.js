// Source: trinity/trinity/Eve/SpaceObject/EveMissileWarhead.h
// Source: trinity/trinity/Eve/SpaceObject/EveMissileWarhead.cpp
import { mat4 } from "#math/mat4";
import { carbonPerlin1D } from "#math/noise";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta } from "#schema";
import { ShaderType } from "#consts/render-context";
import { EveTransform } from "./EveTransform.js";
import { mappedInterfaces } from "../../../global/compose/interface.js";
import { Tr2GpuSharedEmitter } from "../../particle/emitter/Tr2GpuSharedEmitter.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { State, StateChangeEvent } from "../../generated/eve/spaceObject/enums.js";


/**
 * One warhead of a missile: its launch-to-explosion state machine, the
 * noise-perturbed offset path it flies relative to the missile, and the impact
 * test against the target.
 */
@meta.define({ className: "EveMissileWarhead", family: "eve/spaceObject" })
export class EveMissileWarhead extends EveTransform
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 pathOffsetNoiseScale = 0;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 pathOffsetNoiseSpeed = 1;
  @meta.blue.readwrite
  @meta.type.boolean startDataValid = false;
  @meta.blue.readwrite
  @meta.type.vec3 pathOffset = vec3.create();
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 maxExplosionDistance = 40;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 impactDuration = 0.6;
  @meta.blue.read
  @meta.type.vec3 explosionPosition = vec3.create();
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 impactSize = 0;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSpriteSet") spriteSet = null;
  @meta.blue.read
  @meta.type.int32 targetLocatorID = -1;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 durationEjectPhase = 0;
  @meta.blue.readwrite
  @meta.type.boolean doSpread = true;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 acceleration = 1;
  @meta.blue.readwrite
  @meta.type.int32 id = -1;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 startEjectVelocity = 0;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 warheadLength = 1;
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32 warheadRadius = 1;

  _state = EveMissileWarhead.State.STATE_DELAYED;
  _flyingTime = 0;
  _movement = vec3.create();
  _positionLastFrame = vec3.create();
  _lastRelativePosition = vec3.create();
  _currentStartOffset = vec3.create();
  _startOrientation = quat.create();
  _oldEndOffset = vec3.create();
  _currentEndOffset = vec3.create();
  _endOffset = vec3.create();
  _currentOffset = vec3.create();
  _currentOrientation = quat.create();
  _currentEjectVelocity = 0;
  _currentDurationEjectPhase = 0;
  _currentOffsetTransform = mat4.create();
  _finalDestinationTimer = 0;
  _finalTargetTime = 0.75 - Math.random() * 0.1;
  _speedModifier = 1.04 - Math.random() * 0.08;
  _explosionDistance = 0;
  _bombFlightpath = false;
  _lastPositionValid = false;
  _noisePhase = EveMissileWarhead._nextNoisePhase++ & 0xfff;

  /** Registers the sprite effect independently of launch state and mesh visibility. */
  @meta.blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.spriteSet) this.spriteSet.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Submits valid, non-dead warhead sprites at the current world transform. */
  @meta.blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(_frustum, quadRenderer)
  {
    if (!this.startDataValid || this._state === EveMissileWarhead.State.STATE_DEAD) return;
    if (this.spriteSet) this.spriteSet.AddToQuadRenderer(quadRenderer, this.worldTransform, 1, 1, null, 0);
  }

  /**
   * Resets the warhead to its pre-launch state and re-rolls the randomized
   * explosion distance, speed modifier and final-target timing that vary this
   * flight.
   */
  @meta.blue.method
  @meta.implemented
  PrepareLaunch()
  {
    this._currentEjectVelocity = this.startEjectVelocity;
    this._currentDurationEjectPhase = this.durationEjectPhase;
    const distance = this.maxExplosionDistance - Math.random() * this.maxExplosionDistance * 0.5;
    this._explosionDistance = distance * distance;
    this._state = EveMissileWarhead.State.STATE_DELAYED;
    this._flyingTime = 0;
    vec3.set(this._currentStartOffset, 0, 0, 0);
    quat.identity(this._startOrientation);
    this.startDataValid = false;
    vec3.set(this._oldEndOffset, 0, 0, 0);
    vec3.set(this._currentEndOffset, 0, 0, 0);
    vec3.set(this._endOffset, 0, 0, 0);
    vec3.set(this._currentOffset, 0, 0, 0);
    quat.identity(this._currentOrientation);
    this._finalDestinationTimer = 0;
    this.targetLocatorID = -1;
    vec3.set(this.explosionPosition, 0, 0, 0);
    mat4.identity(this._currentOffsetTransform);
    this._speedModifier = 1.04 - Math.random() * 0.08;
    this._finalTargetTime = 0.75 - Math.random() * 0.1;
    this._bombFlightpath = false;
    this._lastPositionValid = false;
  }

  /**
   * Latches the launch transform as the warhead's start offset and orientation
   * and marks the start data valid, which releases the state machine from its
   * delayed state.
   */
  @meta.blue.method
  @meta.implemented
  Launch(startTransform)
  {
    mat4.getRotation(this._startOrientation, startTransform);
    vec3.set(this._currentStartOffset, startTransform[12], startTransform[13], startTransform[14]);
    quat.copy(this._currentOrientation, this._startOrientation);
    vec3.copy(this._currentOffset, this._currentStartOffset);
    this.startDataValid = true;
    this._lastPositionValid = false;
  }

  /**
   * Sets the destination offset the warhead flies toward; on a target switch it
   * also snapshots the previous destination and flight time so the change is
   * blended in rather than snapped.
   */
  @meta.blue.method
  @meta.implemented
  UpdateEndTransform(endTransform, switchLocators)
  {
    vec3.set(this._endOffset, endTransform[12], endTransform[13], endTransform[14]);
    if (switchLocators)
    {
      this._finalDestinationTimer = this._flyingTime;
      vec3.copy(this._oldEndOffset, this._currentEndOffset);
    }
  }

  /**
   * Advances the delayed/launch/ejecting/tracking state machine by one frame, picking a damage locator when tracking begins and again at the spread-to-final switch.
   * @returns {number} The state-change event the missile must act on, or EVT_NONE.
   */
  @meta.blue.method
  @meta.implemented
  UpdateState(deltaTime, estimatedTotalAliveTime, target)
  {
    this._bombFlightpath = !target;
    let event = EveMissileWarhead.StateChangeEvent.EVT_NONE;
    const totalFlyingTime = Math.max((Number(estimatedTotalAliveTime) + 0.1) * this._speedModifier, Number.EPSILON);
    const flight = clamp01(this._flyingTime / totalFlyingTime);
    switch (this._state)
    {
      case EveMissileWarhead.State.STATE_DELAYED:
        if (this.startDataValid) this._state = EveMissileWarhead.State.STATE_LAUNCH;
        break;
      case EveMissileWarhead.State.STATE_LAUNCH:
        this.EnableParticleEmitting(true);
        this._state = EveMissileWarhead.State.STATE_EJECTING;
        break;
      case EveMissileWarhead.State.STATE_EJECTING:
        this._currentDurationEjectPhase -= Number(deltaTime);
        if (this._currentDurationEjectPhase <= 0)
        {
          this._currentDurationEjectPhase = 0;
          this._state = EveMissileWarhead.State.STATE_START_TRACKING;
        }
        break;
      case EveMissileWarhead.State.STATE_START_TRACKING:
        this.targetLocatorID = target ? Number(target.GetGoodDamageLocatorIndex(this.GetWorldPosition())) | 0 : -1;
        this._state = estimatedTotalAliveTime >= 5 && this.doSpread
          ? EveMissileWarhead.State.STATE_TRACKING_SPREAD
          : EveMissileWarhead.State.STATE_TRACKING_FINAL;
        break;
      case EveMissileWarhead.State.STATE_TRACKING_SPREAD:
        if (flight >= this._finalTargetTime)
        {
          this.targetLocatorID = target ? Number(target.GetGoodDamageLocatorIndex(this.GetWorldPosition())) | 0 : -1;
          event = EveMissileWarhead.StateChangeEvent.EVT_SWITCH_TARGET;
          this._state = EveMissileWarhead.State.STATE_TRACKING_FINAL;
        }
        break;
      case EveMissileWarhead.State.STATE_EXPLODED:
        this._state = EveMissileWarhead.State.STATE_DEAD;
        break;
      default:
        break;
    }
    return event;
  }

  /**
   * Tests the final tracking segment for a hit on the target - or detonates immediately when there is no target - recording the explosion position and spawning an impact on the target when impactSize is set.
   * @returns {number} EVT_EXPLODE when the warhead detonated this frame, otherwise EVT_NONE.
   *
   * Adapted: Targetable output parameters are out-last. Missing: native timeout collision short-circuit and EXPLODED-before-CreateImpact ordering remain a separate repair.
   */
  @meta.blue.method
  @meta.adapted
  CheckImpact(deltaTime, estimatedTotalAliveTime, target)
  {
    if (this._state !== EveMissileWarhead.State.STATE_TRACKING_FINAL || this.id < 0) return EveMissileWarhead.StateChangeEvent.EVT_NONE;
    const totalFlyingTime = Math.max((Number(estimatedTotalAliveTime) + 0.1) * this._speedModifier, Number.EPSILON);
    const flight = clamp01((this._flyingTime - Number(deltaTime)) / totalFlyingTime);
    const positionNow = this.GetWorldPosition(EveMissileWarhead._positionNow);
    if (!target)
    {
      vec3.copy(this.explosionPosition, positionNow);
      this._state = EveMissileWarhead.State.STATE_EXPLODED;
      return EveMissileWarhead.StateChangeEvent.EVT_EXPLODE;
    }

    vec3.subtract(EveMissileWarhead._positionLast, positionNow, this._movement);
    vec3.copy(EveMissileWarhead._targetPosition, positionNow);
    const hit = target.GetImpactPosition(this.targetLocatorID, EveMissileWarhead._positionLast, positionNow, this._explosionDistance, EveMissileWarhead._targetPosition);
    if (flight < 1 && !hit) return EveMissileWarhead.StateChangeEvent.EVT_NONE;

    vec3.copy(this.explosionPosition, positionNow);
    vec3.subtract(EveMissileWarhead._impactDirection, EveMissileWarhead._targetPosition, positionNow);
    if (vec3.dot(EveMissileWarhead._impactDirection, this._movement) < 0) vec3.copy(this.explosionPosition, EveMissileWarhead._targetPosition);
    if (this.impactSize > 0)
    {
      vec3.negate(EveMissileWarhead._impactDirection, this._movement);
      target.CreateImpact(this.targetLocatorID, EveMissileWarhead._impactDirection, this.impactDuration, this.impactSize);
    }
    this._state = EveMissileWarhead.State.STATE_EXPLODED;
    return EveMissileWarhead.StateChangeEvent.EVT_EXPLODE;
  }

  /**
   * Samples the Perlin path offset for the current flight time, runs the
   * base update passes, and recomputes the per-frame movement vector that impact
   * direction and orientation depend on; the noise phase is a stable
   * per-instance sequence rather than Carbon's pointer-derived one.
   *
   * Adapted: Carbon's pointer-derived Perlin phase is replaced with a stable per-instance 12-bit sequence.
   */
  @meta.blue.method
  @meta.adapted
  Update(context)
  {
    const position = this._flyingTime * this.pathOffsetNoiseSpeed + this._noisePhase;
    this.pathOffset[0] = carbonPerlin1D(position, 1.1, 2, 3) * this.pathOffsetNoiseScale;
    this.pathOffset[1] = carbonPerlin1D(position + 10.1, 1.1, 2, 3) * this.pathOffsetNoiseScale;
    this.pathOffset[2] = carbonPerlin1D(position + 18.3, 1.1, 2, 3) * this.pathOffsetNoiseScale;
    vec3.subtract(this._positionLastFrame, this._positionLastFrame, context.GetOriginShift());
    super.Update(context);
    this.GetWorldPosition(EveMissileWarhead._positionNow);
    vec3.subtract(this._movement, EveMissileWarhead._positionNow, this._positionLastFrame);
    vec3.copy(this._positionLastFrame, EveMissileWarhead._positionNow);
  }

  /**
   * Integrates one frame of flight - eject velocity, inherited ship velocity,
   * start-to-destination interpolation shaped by acceleration, the noise path
   * offset and the bomb falloff - then rebuilds the warhead's offset transform
   * and slerps its orientation toward the direction of travel.
   *
   * Adapted: Flight produces only the offset transform; visibility publishes world placement. Per-object data uses fresh CPU records instead of persistent native buffer invalidation.
   */
  @meta.blue.method
  @meta.adapted
  UpdateWarhead(deltaTime, estimatedTotalAliveTime, currentBallVelocity, currentInheritedVelocity, inverseBallRotation, missileTransform, originShift = EveMissileWarhead._zero)
  {
    const dt = Number(deltaTime) || 0;
    vec3.set(EveMissileWarhead._ejectVelocity, 0, 0, this._currentEjectVelocity);
    vec3.transformQuat(EveMissileWarhead._ejectVelocity, EveMissileWarhead._ejectVelocity, this._startOrientation);
    transformNormal(EveMissileWarhead._globalBallVelocity, currentBallVelocity, inverseBallRotation);
    if (this._state >= EveMissileWarhead.State.STATE_START_TRACKING) this._flyingTime += dt;

    const totalFlyingTime = Math.max((Number(estimatedTotalAliveTime) + 0.1) * this._speedModifier, Number.EPSILON);
    const flight = clamp01(this._flyingTime / totalFlyingTime);
    const quickFlight = clamp01(3 * flight);
    if (this._state >= EveMissileWarhead.State.STATE_EJECTING) vec3.scaleAndAdd(this._currentStartOffset, this._currentStartOffset, EveMissileWarhead._ejectVelocity, dt);
    vec3.scaleAndAdd(this._currentStartOffset, this._currentStartOffset, currentInheritedVelocity, dt);

    const denominator = totalFlyingTime - this._finalDestinationTimer;
    const targetTime = denominator ? clamp01((this._flyingTime - this._finalDestinationTimer) / denominator) : 1;
    vec3.scale(EveMissileWarhead._modifiedOldOffset, this._oldEndOffset, 1 - clamp01(targetTime * 2));
    vec3.lerp(this._currentEndOffset, EveMissileWarhead._modifiedOldOffset, this._endOffset, targetTime);
    vec3.lerp(this._currentOffset, this._currentStartOffset, this._currentEndOffset, Math.pow(flight, 1 + this.acceleration));

    vec3.scale(EveMissileWarhead._globalBallVelocity, EveMissileWarhead._globalBallVelocity, 1 - flight);
    vec3.scaleAndAdd(this._currentStartOffset, this._currentStartOffset, EveMissileWarhead._globalBallVelocity, -dt);
    this._currentEjectVelocity = this.startEjectVelocity * (1 - Math.pow(quickFlight, 1 + this.acceleration));
    vec3.scaleAndAdd(this._currentOffset, this._currentOffset, this.pathOffset, Math.sin(Math.PI * flight) ** 2);
    if (this._bombFlightpath) vec3.scale(this._currentOffset, this._currentOffset, (1 - quickFlight) ** 2);

    vec3.transformMat4(EveMissileWarhead._relativePosition, this._currentOffset, missileTransform);
    vec3.subtract(EveMissileWarhead._translation, this._lastRelativePosition, EveMissileWarhead._relativePosition);
    vec3.add(EveMissileWarhead._translation, EveMissileWarhead._translation, originShift);
    vec3.copy(this._lastRelativePosition, EveMissileWarhead._relativePosition);
    if (this._lastPositionValid && this.startDataValid)
    {
      const distanceSquared = vec3.squaredLength(EveMissileWarhead._translation);
      if (distanceSquared > 0)
      {
        transformNormal(EveMissileWarhead._translation, EveMissileWarhead._translation, inverseBallRotation);
        mat4.arcFromForward(EveMissileWarhead._orientationMatrix, EveMissileWarhead._translation);
        mat4.getRotation(EveMissileWarhead._orientationNow, EveMissileWarhead._orientationMatrix);
        if (distanceSquared < 1)
        {
          quat.slerp(this._currentOrientation, this._currentOrientation, EveMissileWarhead._orientationNow, distanceSquared);
          quat.normalize(this._currentOrientation, this._currentOrientation);
        }
        else quat.copy(this._currentOrientation, EveMissileWarhead._orientationNow);
      }
    }
    else this._lastPositionValid = true;

    mat4.fromRotationTranslation(this._currentOffsetTransform, this._currentOrientation, this._currentOffset);
  }

  /**
   * Enables only native shared GPU emitters, including those of children whose
   * Blue exposure maps EveTransform.
   */
  @meta.blue.method
  @meta.implemented
  EnableParticleEmitting(enable)
  {
    for (const child of this.children)
    {
      if (!mappedInterfaces(child.constructor).has(EveTransform)) continue;
      for (const emitter of child.particleEmitters)
      {
        if (CjsSchema.cast(emitter, Tr2GpuSharedEmitter)) emitter.Enable(enable);
      }
    }
    for (const emitter of this.particleEmitters)
    {
      if (CjsSchema.cast(emitter, Tr2GpuSharedEmitter)) emitter.Enable(enable);
    }
  }

  /**
   * Carbon EveMissileWarhead::UpdateVisibility (cpp:109-157), which does not
   * call EveTransform's: not visible until the start data is valid and the
   * warhead alive; LOW lod when hidden on low quality or not displayed;
   * otherwise visible, the view-dependent data updated from the parent, and
   * the lod raised from the bounding sphere's pixel size - HIGH from the
   * medium-detail threshold, MEDIUM from the VISIBILITY threshold (Carbon:
   * the warhead mesh is hidden entirely at LOW, so the low-detail threshold
   * is not used). Returns the visibility.
   */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(context, parentTransform)
  {
    this._isVisible = false;
    if (!this.startDataValid || this._state === EveMissileWarhead.State.STATE_DEAD) return false;

    this.lodLevel = EveTransform.Tr2Lod.TR2_LOD_LOW;
    if ((this.hideOnLowQuality && Tr2Renderer.IsLowQuality()) || !this.display) return false;

    const frustum = context.GetFrustum();
    this._isVisible = true;
    this.UpdateViewDependentData(context, parentTransform);

    if (this.mesh)
    {
      const sphere = EveMissileWarhead._visibilitySphere;
      if (this.GetBoundingSphere(sphere) && frustum.IsSphereVisible(sphere))
      {
        const size = frustum.GetPixelSizeAccross(sphere);
        if (size >= context.GetMediumDetailThreshold()) this.lodLevel = EveTransform.Tr2Lod.TR2_LOD_HIGH;
        else if (size >= context.GetVisibilityThreshold()) this.lodLevel = EveTransform.Tr2Lod.TR2_LOD_MEDIUM;
      }
    }
    return this._isVisible;
  }

  /**
   * Appends the warhead mesh; nothing is appended while the warhead is
   * invisible or at low LOD. The sprite set is NOT gathered here: Carbon's
   * EveMissileWarhead::GetRenderables never touches it, and EveSpriteSet has
   * no GetRenderables at all - attachments render through the batch path.
   */
  @meta.blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    if (!this._isVisible || this.lodLevel <= EveTransform.Tr2Lod.TR2_LOD_LOW) return out;
    if (this.mesh) out.push(this);
    return out;
  }

  /**
   * Writes the world-space sphere enclosing the warhead body, sized and centred
   * from warheadLength.
   */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(EveMissileWarhead._localSphere, 0, 0, this.warheadLength * 0.5, this.warheadLength * 0.5);
    sph3.transformMat4(out, EveMissileWarhead._localSphere, this.worldTransform);
    return true;
  }

  /**
   * Writes the warhead body sphere in the missile's space, which the missile
   * unions into its own bounding sphere.
   */
  @meta.blue.method
  @meta.implemented
  GetLocalBoundingSphere(out = vec4.create())
  {
    vec4.set(EveMissileWarhead._localSphere, 0, 0, this.warheadLength * 0.5, this.warheadLength * 0.5);
    sph3.transformMat4(out, EveMissileWarhead._localSphere, this._currentOffsetTransform);
    return true;
  }

  /**
   * Returns the warhead's live offset transform relative to the missile; it is
   * the warhead's own matrix and is rewritten by the next flight update.
   */
  @meta.blue.method
  @meta.implemented
  GetCurrentOffsetTransform()
  {
    return this._currentOffsetTransform;
  }

  /**
   * Returns the damage locator index this warhead is tracking, or -1 when none
   * has been chosen.
   */
  @meta.blue.method
  @meta.implemented
  GetTargetLocator()
  {
    return this.targetLocatorID;
  }

  /** Overrides the damage locator index this warhead tracks. */
  @meta.blue.method
  @meta.implemented
  SetTargetLocator(locator)
  {
    this.targetLocatorID = Number(locator) | 0;
  }

  /** Returns the current flight state, one of EveMissileWarhead.State. */
  @meta.blue.method
  @meta.implemented
  GetState()
  {
    return this._state;
  }

  /**
   * Returns the authored warhead id, which the missile passes to the explosion
   * callback.
   */
  @meta.blue.method
  @meta.implemented
  GetWarheadID()
  {
    return this.id;
  }

  /**
   * Allocates the warhead's per-object record and sets the world transform and
   * the radius/length pair the shader needs; the record carries values only,
   * never GPU resources.
   *
   * Adapted: A fresh CPU record encodes the world and missile size fields instead of invalidating persistent native per-object buffers.
   */
  @meta.blue.method
  @meta.adapted
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveMissileWarheadPerObjectData");
    data.SetAndTranspose("world", this.worldTransform);
    data.Set("missileSize", [this.warheadRadius, this.warheadLength, 0, 0]);
    return data;
  }

  /**
   * Carbon GetPerObjectDataSize (EveMissileWarhead.cpp:617-628): zero for the
   * pixel stage, else the 64-byte world matrix plus the 16-byte missile-size
   * vector. A pure size contract that must match UpdatePerObjectBuffer's
   * layout below.
   */
  @meta.blue.method
  @meta.implemented
  GetPerObjectDataSize(shaderType)
  {
    return shaderType === ShaderType.PIXEL_SHADER ? 0 : 64 + 16;
  }

  /**
   * Carbon UpdatePerObjectBuffer (cpp:630-641): packs Transpose(world) then
   * Vector4(warheadRadius, warheadLength, 0, 0) into caller-owned CPU staging
   * bytes for every non-pixel stage. No AL object is touched here; the upload
   * happens on the engine side of the boundary.
   *
   * @param {number} shaderType A ShaderType value.
   * @param {number} _size Caller's byte budget (Carbon ignores it too).
   * @param {DataView} data Caller-owned staging view, little-endian.
   */
  @meta.blue.method
  @meta.implemented
  UpdatePerObjectBuffer(shaderType, _size, data)
  {
    if (shaderType === ShaderType.PIXEL_SHADER) return;

    mat4.transpose(EveMissileWarhead._transposedWorld, this.worldTransform);
    for (let i = 0; i < 16; i++)
    {
      data.setFloat32(i * 4, EveMissileWarhead._transposedWorld[i], true);
    }
    data.setFloat32(64, this.warheadRadius, true);
    data.setFloat32(68, this.warheadLength, true);
    data.setFloat32(72, 0, true);
    data.setFloat32(76, 0, true);
  }

  static State = State;

  static StateChangeEvent = StateChangeEvent;

  static _nextNoisePhase = 1;
  static _transposedWorld = mat4.create();
  static _zero = vec3.create();
  static _localSphere = vec4.create();

  /** UpdateVisibility's world sphere (GetBoundingSphere writes through _localSphere). */
  static _visibilitySphere = vec4.create();
  static _positionNow = vec3.create();
  static _positionLast = vec3.create();
  static _targetPosition = vec3.create();
  static _impactDirection = vec3.create();
  static _ejectVelocity = vec3.create();
  static _globalBallVelocity = vec3.create();
  static _modifiedOldOffset = vec3.create();
  static _relativePosition = vec3.create();
  static _translation = vec3.create();
  static _orientationNow = quat.create();
  static _orientationMatrix = mat4.create();
}

/** Clamps a numeric flight fraction to the unit interval. */
function clamp01(value)
{
  return Math.max(0, Math.min(1, Number(value) || 0));
}

/** Applies only the linear part of a column-vector matrix to a required direction. */
function transformNormal(out, vector, matrix)
{
  const x = vector[0];
  const y = vector[1];
  const z = vector[2];
  out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
  out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
  out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
  return out;
}

// Native concrete exposure chains EveTransform.
meta.blue.interfaceTable({
  interfaces: [ EveMissileWarhead, EveTransform ],
  chainTo: EveTransform
})(EveMissileWarhead, { kind: "class" });
