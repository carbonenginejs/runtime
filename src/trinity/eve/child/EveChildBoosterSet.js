// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet_Blue.cpp
import { ITr2ControllerOwner } from "../../controllers/ITr2ControllerOwner.js";
import { EveEntity } from "../EveEntity.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
//
// The attachment-side booster family (EveBoosterSet2 + renderable + trails)
// lives in eve/attachment/booster/; both sides share
// eve/attachment/booster/boosterUtilities.js.
import { mat4 } from "#math/mat4";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { IsMatch } from "#blue";
import { TriBatchType } from "#consts/graphics";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { EveChildBoosterSetSingleBoosterData } from "./EveChildBoosterSetSingleBoosterData.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/index.js";
import {
  AddBoosterLights,
  CHILD_BOOSTER_BOX_BUFFER_NAME,
  CreateBoosterFlares,
  GenerateBoosterLightPhase,
  PadBoosterBoundingSphere
} from "../attachment/booster/boosterUtilities.js";
import { TriStorageFlags } from "#consts/graphics";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/index.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";

// Tr2ChildBoosterInstanceData (Tr2RingBuffer.h:19-26): Float4x3 transform
// (COLUMN-stride rows), intensity, wavePhase, atlasIndex0, atlasIndex1 -
// 64 bytes, 16 four-byte lanes per instance.
export const CHILD_BOOSTER_INSTANCE_STRIDE = 16;

// Tr2RingBufferOffsets::INVALID_OFFSET (Tr2RingBuffer.h:95); moves onto
// the Tr2RingBufferOffsets class as its owner once the AL lane ships it.
export const INVALID_RING_OFFSET = 0xffffffff;

const SPHERE_SCRATCH = vec4.create();


/**
 * The child-graph booster set: instanced booster geometry, the lensflare
 * sprite set at each exhaust point, and the flickering point lights.
 * Placement comes entirely from Add() matrices. Carbon keeps the resulting
 * booster records private; they persist here, and Initialize derives the
 * flares, bounds and max size from them.
 *
 * RENDERING SEAM: Carbon draws through the Tr2ChildBoosterInstanceData ring
 * buffer (global "ChildBoosterSetInstances", GPU buffer
 * "ChildBoosterSetInstanceBuffer", EveSpaceScene.cpp:261-262) - the AL
 * backend's lane. The CPU half packs the instance rows every async update;
 * without an installed ring buffer the frame offset stays INVALID and
 * GetBatches produces nothing, which is Carbon's own no-draw path for an
 * invalid offset (EveChildBoosterSet.cpp:478).
 */
@blue.define("EveChildBoosterSet")
@blue.inherit(ITr2Renderable)
@blue.inherit(INotify, IInitialize, ITr2ControllerOwner)
@blue.interface(EveSpaceObjectChild, IEveSpaceObjectChild, INotify, IInitialize, EveEntity, ITr2Renderable, ITr2ControllerOwner)
export class EveChildBoosterSet extends EveSpaceObjectChild
{

  static DEFAULT_DRIVE_NAME = "ThrustMain";

  static WARP_DRIVE_NAME = "WarpState";

  static DEFAULT_EFFECT_PATH = "res:/Graphics/Effect/Managed/Space/Booster/ChildBoosterVolumetric.fx";

  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  /** The biggest booster size of this set; runtime-derived. */
  @blue.read
  @type.float32
  maxSize = 0;

  /** The warp factor of the ship; runtime toggle, not persisted. */
  @blue.readwrite
  @type.float32
  warpIntensity = 0;

  /** The thrust of the ship; runtime toggle, not persisted. */
  @blue.readwrite
  @type.float32
  thrust = 0;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  glowScale = 1;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec4
  glowColor = vec4.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  symHaloScale = 1;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  haloScaleX = 1;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  haloScaleY = 1;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec4
  haloColor = vec4.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec4
  warpGlowColor = vec4.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec4
  warpHaloColor = vec4.create();

  @blue.readwrite
  @blue.persist
  @type.float32
  lightOffset = 0;

  @blue.readwrite
  @blue.persist
  @type.float32
  lightFlickerAmplitude = 0;

  @blue.readwrite
  @blue.persist
  @type.float32
  lightFlickerFrequency = 0;

  @blue.readwrite
  @blue.persist
  @type.float32
  lightRadius = 0;

  @blue.readwrite
  @blue.persist
  @type.vec4
  lightColor = vec4.create();

  @blue.readwrite
  @blue.persist
  @type.float32
  lightWarpRadius = 0;

  @blue.readwrite
  @blue.persist
  @type.vec4
  lightWarpColor = vec4.create();

  /** Controller name the booster observes for the thrust value. */
  @blue.readwrite
  @blue.persist
  @type.string
  driveName = EveChildBoosterSet.DEFAULT_DRIVE_NAME;

  /** When false the flares draw even at booster-LOD distances. */
  @blue.notify
  @blue.readwrite
  @type.boolean
  flareLodEnabled = true;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  effect = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  effectFar = null;

  /** Sprite set rendering the glows on the boosters. */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSpriteSet")
  glows = null;

  /**
   * m_singleBoosters (h:180). Carbon does not map it; it persists here so
   * values carry the boosters, and Initialize derives the flares, bounds and
   * max size from it.
   */
  @blue.persistOnly
  @type.list("EveChildBoosterSetSingleBoosterData")
  _singleBoosters = [];

  // The exact exhaust-point bounding sphere (positions only; padded in
  // GetBoundingSphere) plus Carbon's uninitialized sentinel as a flag.
  _boosterBoundingSphere = vec4.create();

  _boosterBoundingSphereInitialized = false;

  // The packed Tr2ChildBoosterInstanceData rows (CPU half of cpp:107-117).
  _instanceData = new Float32Array(0);

  _instanceDataU32 = new Uint32Array(0);

  _instanceCount = 0;

  // The AL ring buffer (Carbon's Tr2RingBuffer singleton) and this set's
  // per-consumer cursor (Carbon m_ringBufferOffsets, a Tr2RingBufferOffsets
  // value member, EveChildBoosterSet.h:229). Until the AL lane ships the
  // real classes the engine installs both; a null pair keeps the frame
  // offset INVALID and the set undrawn, exactly as Carbon's invalid ring
  // offset does.
  _ringBuffer = null;

  _ringBufferOffsets = null;

  _parentTransform = mat4.create();

  _parentScale = 1;

  _boosterHighLod = false;

  _boostersVisible = false;

  _glowsVisible = false;

  _isVisible = false;

  _hasUpdated = false;

  /** m_vertexDeclHandle: the box's declaration, made by OnPrepareResources. */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /**
   * Registers with the device, as Carbon's Tr2DeviceResource base does
   * (EveChildBoosterSet.h:81), so a set built before the device exists is
   * prepared when it comes up. JavaScript has no destructor, so the set is
   * never unregistered.
   */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /**
   * Carbon Initialize (cpp:72-76) prepares the device resources.
   *
   * Adapted: a set whose boosters arrived as records rather than through Add
   * derives what Add derives from them: the flares, the bounding sphere and
   * the max size.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    if (this._singleBoosters.length) this._DeriveFromBoosters();
    this.PrepareResources();
    return true;
  }

  /** Re-derives the flares, bounding sphere and max size from the booster records. */
  _DeriveFromBoosters()
  {
    if (this.glows)
    {
      this.glows.Clear();
      for (const booster of this._singleBoosters)
      {
        CreateBoosterFlares(this.glows, booster.transform, this._GetFlareParams());
      }
      this.glows.Rebuild();
    }
    this._boosterBoundingSphereInitialized = false;
    vec4.set(this._boosterBoundingSphere, 0, 0, 0, 0);
    this.maxSize = 0;
    for (const booster of this._singleBoosters)
    {
      const transform = booster.transform;
      this._IncludeBoundingPoint(transform[12], transform[13], transform[14]);
      this.maxSize = Math.max(this.maxSize, Math.max(
        Math.hypot(transform[0], transform[1], transform[2]),
        Math.hypot(transform[4], transform[5], transform[6])));
    }
  }

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32). */
  @blue.method
  @meta.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      if (!this.OnPrepareResources()) return false;
    }
    return true;
  }

  /** Carbon OnPrepareResources (cpp:267-286): the box's one-position vertex declaration. */
  @blue.method
  @meta.implemented
  OnPrepareResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(EveChildBoosterSet._BoosterVertex());
    return this._vertexDeclHandle !== Tr2EffectStateManager.Unknown;
  }

  /** Carbon ReleaseResources (cpp:258-261): forget the declaration. */
  @blue.method
  @meta.implemented
  ReleaseResources(_storage)
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /** Carbon's function-local static s_boosterVertex (cpp:271-276). */
  static _BoosterVertex()
  {
    if (!EveChildBoosterSet._boosterVertex)
    {
      const vd = new Tr2VertexDefinition();
      vd.Add("FLOAT32_3", "POSITION");
      EveChildBoosterSet._boosterVertex = vd;
    }
    return EveChildBoosterSet._boosterVertex;
  }

  static _boosterVertex = null;

  /**
   * Carbon EveChildBoosterSet::OnModified (cpp:77-93): rebuilds the flares when
   * a glow or halo field changes; other members (flareLodEnabled) rebuild
   * nothing.
   *
   * @param {*} [value=null] The modified member, by exposed name.
   * @returns {boolean} Always true.
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (this.glows && (IsMatch(value, "glowScale") || IsMatch(value, "haloScaleX") || IsMatch(value, "haloScaleY")
      || IsMatch(value, "symHaloScale") || IsMatch(value, "glowColor") || IsMatch(value, "warpGlowColor")
      || IsMatch(value, "haloColor") || IsMatch(value, "warpHaloColor")))
    {
      this.glows.Clear();
      for (const booster of this._singleBoosters)
      {
        CreateBoosterFlares(this.glows, booster.transform, this._GetFlareParams());
      }
      this.glows.Rebuild();
    }
    return true;
  }

  /** Collects this booster's glow and halo settings for flare creation. */
  _GetFlareParams()
  {
    return {
      warpGlowColor: this.warpGlowColor,
      glowScale: this.glowScale,
      glowColor: this.glowColor,
      haloScaleX: this.haloScaleX,
      haloScaleY: this.haloScaleY,
      symHaloScale: this.symHaloScale,
      haloColor: this.haloColor,
      warpHaloColor: this.warpHaloColor
    };
  }

  /**
   * Installs the AL ring buffer and this set's per-consumer offsets cursor.
   * Both contracts are NOMINAL, not duck-typed: the offsets object MUST
   * provide Carbon's Tr2RingBufferOffsets surface - AdvanceFrame(),
   * UploadTransforms(ringBuffer, data, count) returning void, and
   * GetCurrentFrameOffset()/GetPreviousFrameOffset() (Tr2RingBuffer.h:
   * 84-99; all Carbon's own names). Only the OBJECTS are nullable - null
   * means no AL backend, Carbon's invalid-offset undrawn state. Once the
   * AL lane ships Tr2RingBufferOffsets as a runtime class, this set will
   * construct its own cursor by value as Carbon does and this method will
   * take only the ring.
   */
  SetRingBuffer(ringBuffer, ringBufferOffsets = null)
  {
    this._ringBuffer = ringBuffer ?? null;
    this._ringBufferOffsets = this._ringBuffer ? (ringBufferOffsets ?? null) : null;
  }

  /** The current ring frame offset, INVALID without an AL backend. */
  _CurrentFrameOffset()
  {
    return this._ringBufferOffsets
      ? this._ringBufferOffsets.GetCurrentFrameOffset()
      : INVALID_RING_OFFSET;
  }

  /** The packed instance rows and lane count for the AL upload. */
  GetInstanceBufferData()
  {
    return {
      data: this._instanceData.subarray(0, this._instanceCount * CHILD_BOOSTER_INSTANCE_STRIDE),
      count: this._instanceCount,
      stride: CHILD_BOOSTER_INSTANCE_STRIDE
    };
  }

  /**
   * Async update (Carbon cpp:101-131): packs the visible instance rows
   * (Float4x3 COLUMN-stride transform + intensity + wavePhase + atlas
   * indices), uploads them when a ring buffer is installed, and caches the
   * parent transform and its largest-axis scale.
   *
   * Adapted: Ring-buffer AdvanceFrame/UploadTransforms are the AL backend's; the CPU packs the rows and the offset
   * stays INVALID (Carbon's own no-draw state) until a ring buffer is installed.
   */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(_updateContext = null, params = null)
  {
    // Carbon cpp:103; the offsets cursor owns its methods - nullability is
    // state, method existence is contract.
    if (this._ringBufferOffsets)
    {
      this._ringBufferOffsets.AdvanceFrame();
    }

    if (params?.isVisible)
    {
      const lanes = this._singleBoosters.length * CHILD_BOOSTER_INSTANCE_STRIDE;
      if (this._instanceData.length < lanes)
      {
        this._instanceData = new Float32Array(lanes);
        this._instanceDataU32 = new Uint32Array(this._instanceData.buffer);
      }
      let lane = 0;
      for (const booster of this._singleBoosters)
      {
        const transform = booster.transform;
        // Float4x3 rows are the transpose's rows: (m0 m4 m8 m12) ...
        this._instanceData[lane + 0] = transform[0];
        this._instanceData[lane + 1] = transform[4];
        this._instanceData[lane + 2] = transform[8];
        this._instanceData[lane + 3] = transform[12];
        this._instanceData[lane + 4] = transform[1];
        this._instanceData[lane + 5] = transform[5];
        this._instanceData[lane + 6] = transform[9];
        this._instanceData[lane + 7] = transform[13];
        this._instanceData[lane + 8] = transform[2];
        this._instanceData[lane + 9] = transform[6];
        this._instanceData[lane + 10] = transform[10];
        this._instanceData[lane + 11] = transform[14];
        this._instanceData[lane + 12] = this.thrust;
        this._instanceData[lane + 13] = booster.wavePhase;
        this._instanceDataU32[lane + 14] = booster.atlasIndex0;
        this._instanceDataU32[lane + 15] = booster.atlasIndex1;
        lane += CHILD_BOOSTER_INSTANCE_STRIDE;
      }
      this._instanceCount = this._singleBoosters.length;

      if (this._ringBuffer && this._ringBufferOffsets)
      {
        // Carbon cpp:118: offsets.UploadTransforms(ring, data, count) is
        // void; the frame offset is read back from the cursor.
        this._ringBufferOffsets.UploadTransforms(
          this._ringBuffer, this.GetInstanceBufferData().data, this._instanceCount);
      }
    }

    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      mat4.copy(this._parentTransform, parentTransform);
    }

    // Scale with the highest axis factor - single sqrt of the max squared
    // basis-row length (Carbon cpp:123-128; keep the shape).
    const scaleXSq = this._parentTransform[0] ** 2 + this._parentTransform[1] ** 2 + this._parentTransform[2] ** 2;
    const scaleYSq = this._parentTransform[4] ** 2 + this._parentTransform[5] ** 2 + this._parentTransform[6] ** 2;
    const scaleZSq = this._parentTransform[8] ** 2 + this._parentTransform[9] ** 2 + this._parentTransform[10] ** 2;
    this._parentScale = Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));

    this._hasUpdated = true;
  }

  /** Clears every booster, the glows and the bounds (Carbon cpp:142-157). */
  @blue.method
  @meta.implemented
  Clear()
  {
    this._singleBoosters.length = 0;
    if (this.glows) this.glows.Clear();
    this.maxSize = 0;
    this._boosterBoundingSphereInitialized = false;
    vec4.set(this._boosterBoundingSphere, 0, 0, 0, 0);
    this._instanceCount = 0;
    // cpp:158 - also release the resources.
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  }

  /**
   * Adds one exhaust point (Carbon cpp:160-192): light position pushed back
   * along -Z by lightOffset THROUGH the local matrix, radius from the larger
   * XY basis scale, a random flicker phase and wave phase, flares when a
   * glow set exists, and bounds/max-size growth. SetLightData and SetGlow
   * must run before Add - SOF respects that order.
   */
  @blue.method
  @meta.implemented
  Add(localMatrix, atlasIndex0, atlasIndex1, lightScale = 1)
  {
    this._AddSingleBooster(localMatrix, atlasIndex0, atlasIndex1, lightScale);
  }

  /**
   * Stores one booster transform and its light data, creates flares and extends
   * the bounds.
   */
  _AddSingleBooster(localMatrix, atlasIndex0, atlasIndex1, lightScale)
  {
    const booster = new EveChildBoosterSetSingleBoosterData();
    mat4.copy(booster.transform, localMatrix);
    const transform = booster.transform;
    const scale = Math.max(
      Math.hypot(transform[0], transform[1], transform[2]),
      Math.hypot(transform[4], transform[5], transform[6])
    );
    vec3.transformMat4(booster.lightPosition, [ 0, 0, -this.lightOffset ], transform);
    booster.lightRadius = scale * Number(lightScale);
    booster.lightPhase = GenerateBoosterLightPhase();
    booster.atlasIndex0 = Number(atlasIndex0) >>> 0;
    booster.atlasIndex1 = Number(atlasIndex1) >>> 0;
    booster.wavePhase = Math.random();
    this._singleBoosters.push(booster);

    if (this.glows)
    {
      CreateBoosterFlares(this.glows, booster.transform, this._GetFlareParams());
    }

    // Exact positions only - the exhaust size padding happens in
    // GetBoundingSphere (Carbon's warning comment, cpp:183-186).
    this._IncludeBoundingPoint(transform[12], transform[13], transform[14]);

    if (scale > this.maxSize)
    {
      this.maxSize = scale;
    }
  }

  /** Carbon BoundingSphereUpdate: grow the exact sphere to include a point. */
  _IncludeBoundingPoint(x, y, z)
  {
    const sphere = this._boosterBoundingSphere;
    if (!this._boosterBoundingSphereInitialized)
    {
      this._boosterBoundingSphereInitialized = true;
      vec4.set(sphere, x, y, z, 0);
      return;
    }
    const deltaX = x - sphere[0];
    const deltaY = y - sphere[1];
    const deltaZ = z - sphere[2];
    const distance = Math.hypot(deltaX, deltaY, deltaZ);
    if (distance <= sphere[3]) return;
    const shift = 0.5 * (distance - sphere[3]);
    const scale = shift / distance;
    sphere[0] += deltaX * scale;
    sphere[1] += deltaY * scale;
    sphere[2] += deltaZ * scale;
    sphere[3] += shift;
  }

  /** Sets the whole flare description in one call (Carbon cpp:198-216). */
  @blue.method
  @meta.implemented
  SetData(glowScale, glowColor, warpGlowColor, symHaloScale, haloScaleX, haloScaleY, haloColor, warpHaloColor)
  {
    this.glowScale = Number(glowScale);
    vec4.copy(this.glowColor, glowColor);
    vec4.copy(this.warpGlowColor, warpGlowColor);
    this.symHaloScale = Number(symHaloScale);
    this.haloScaleX = Number(haloScaleX);
    this.haloScaleY = Number(haloScaleY);
    vec4.copy(this.haloColor, haloColor);
    vec4.copy(this.warpHaloColor, warpHaloColor);
  }

  /** Sets the point-light description in one call (Carbon cpp:222-231). */
  @blue.method
  @meta.implemented
  SetLightData(offset, flickerAmplitude, flickerFrequency, radius, color, warpRadius, warpColor)
  {
    this.lightOffset = Number(offset);
    this.lightFlickerAmplitude = Number(flickerAmplitude);
    this.lightFlickerFrequency = Number(flickerFrequency);
    this.lightRadius = Number(radius);
    vec4.copy(this.lightColor, color);
    this.lightWarpRadius = Number(warpRadius);
    vec4.copy(this.lightWarpColor, warpColor);
  }

  /** Sets the near and far booster effects (Carbon cpp:237-241). */
  @blue.method
  @meta.implemented
  SetEffect(effect, effectFar)
  {
    this.effect = effect ?? null;
    this.effectFar = effectFar ?? null;
  }

  /** Sets the glow sprite set (Carbon cpp:247-250). */
  @blue.method
  @meta.implemented
  SetGlow(glow)
  {
    this.glows = glow ?? null;
  }

  /** Sets the controller name observed for the thrust value (Carbon cpp:396-399). */
  @blue.method
  @meta.implemented
  SetDriveName(driveName)
  {
    this.driveName = String(driveName ?? "");
  }

  /**
   * Frame visibility (Carbon cpp:286-319): uses the CACHED parent transform
   * from the async update, not the passed one - booster LOD from twice the
   * padded sphere's pixel size, plus the glow set's own visibility pass.
   */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, _parentTransform = null, _parentLod = 0)
  {
    this._glowsVisible = false;
    this._isVisible = false;
    this._boostersVisible = false;

    if (!this._hasUpdated) return false;

    if (this.display)
    {
      this.GetBoundingSphere(SPHERE_SCRATCH);
      const frustum = updateContext.GetFrustum();

      // LOD for boosters: use the bounding sphere
      const boosterLod = 2 * frustum.GetPixelSizeAccross(SPHERE_SCRATCH);
      this._boosterHighLod = boosterLod > updateContext.GetMediumDetailThreshold() * 1.5;
      this._boostersVisible = boosterLod > updateContext.GetLowDetailThreshold();
      this._isVisible = frustum.IsSphereVisible(SPHERE_SCRATCH);

      if (this.glows && this.glows.UpdateVisibility(updateContext, this._parentTransform, null, 0))
      {
        this._glowsVisible = true;
      }
    }
    return this._isVisible;
  }

  /** Adds this set as a renderable when displayed, lit and visible (Carbon cpp:330-343). */
  @blue.method
  @meta.implemented
  GetRenderables(renderables)
  {
    if (!this.display) return renderables;
    if (this.effect && this._isVisible)
    {
      renderables.push(this);
    }
    return renderables;
  }

  /**
   * The padded world bounding sphere (Carbon cpp:350-360): the shared pad
   * helper, then - unlike EveBoosterSet2 - the radius multiplies by the
   * parent scale. False before the first async update.
   */
  @blue.method
  @meta.implemented
  GetBoundingSphere(sphere = vec4.create(), _query = 0)
  {
    if (!this._hasUpdated) return false;
    PadBoosterBoundingSphere(sphere, this._boosterBoundingSphere, this._parentTransform);
    sphere[3] *= this._parentScale;
    return true;
  }

  /** Forwards quad registration to the glow set (Carbon cpp:368-374). */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.glows)
    {
      this.glows.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /** Forwards glow quads when visible and past flare LOD (Carbon cpp:383-394). */
  @blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(_frustum, quadRenderer)
  {
    if (!this.glows || !this._glowsVisible || !this.display) return;
    if (this._boostersVisible || !this.flareLodEnabled)
    {
      this.glows.AddBoosterGlowToQuadRenderer(quadRenderer, this._parentTransform, this.thrust, this.warpIntensity);
    }
  }

  /**
   * The flickering booster point lights (Carbon cpp:416-440): gated on the
   * first update, a usable radius and positive thrust; radii pre-multiplied
   * by the parent scale - EveBoosterSet2 deliberately does NOT.
   */
  @blue.method
  @meta.implemented
  GetLights(lightManager)
  {
    if (!this._hasUpdated) return;
    if (this.lightRadius <= 0 && this.lightWarpRadius <= 0) return;
    if (this.thrust <= 0) return;
    if (!lightManager) return;

    const params = {
      lightWarpRadius: this.lightWarpRadius * this._parentScale,
      lightWarpColor: this.lightWarpColor,
      lightRadius: this.lightRadius * this._parentScale,
      lightColor: this.lightColor,
      lightFlickerAmplitude: this.lightFlickerAmplitude,
      lightFlickerFrequency: this.lightFlickerFrequency
    };
    const time = Tr2Renderer.GetAnimationTime();
    AddBoosterLights(
      lightManager, this._singleBoosters, this._parentTransform,
      this.thrust, this.warpIntensity, params, time);
  }

  /** Thrust from the observed drive controller, warp from WarpState (Carbon cpp:442-452). */
  @blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    if (name === this.driveName)
    {
      this.thrust = Number(value);
    }
    else if (name === EveChildBoosterSet.WARP_DRIVE_NAME)
    {
      this.warpIntensity = Number(value);
    }
  }

  /** The booster pass is additive-only (Carbon cpp:458-461). */
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Fixed additive sort value (Carbon cpp:522-525). */
  @blue.method
  @meta.implemented
  GetSortValue()
  {
    return 1;
  }

  /**
   * Emits the instanced booster batch (Carbon cpp:468-516): additive-only,
   * gated on display, a VALID ring offset, and a non-empty set; the LOD
   * chooses effect vs effectFar. 36 indices per instance over the shared
   * child-booster box.
   *
   * Adapted: The procedural box vertex buffer and quad-list index buffer are not ported yet; the batch carries the
   * material, per-object data, vertex declaration, draw arguments and the shared buffer name.
   */
  @blue.method
  @meta.adapted
  GetBatches(batches, batchType, perObjectData = null)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE) return;
    if (!this.display) return;
    if (this._CurrentFrameOffset() === INVALID_RING_OFFSET) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    if (!this._singleBoosters.length) return;
    if (!this._boostersVisible) return;

    const effect = (this._boosterHighLod || !this.effectFar) ? this.effect : this.effectFar;
    // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
    if (!effect || !effect.IsGood()) return;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetDrawIndexedInstanced(3 * 2 * 6, this._singleBoosters.length, 0, 0, 0);
    batch.proceduralVertexBufferName = CHILD_BOOSTER_BOX_BUFFER_NAME;
    batches.Commit(batch);
  }

  /**
   * Fills the child-booster per-object records (Carbon cpp:533-557): the
   * LOGICAL parent transform through SetAndTranspose, the max booster size,
   * the ring frame offset, and the warp intensity.
   *
   * Adapted: Carbon's struct fill becomes the registered EveChildBoosterSet RawData layouts; the instanceOffset lane
   * carries the AL ring offset when one is installed.
   */
  @blue.method
  @meta.adapted
  GetPerObjectData(accumulator = null)
  {
    if (typeof accumulator?.Alloc !== "function") return null;
    const vs = accumulator.Alloc("EveChildBoosterSetVSData");
    const ps = accumulator.Alloc("EveChildBoosterSetPSData");
    vs.SetAndTranspose("worldMatrix", this._parentTransform);
    vs.Set("maxBoosterSize", this.maxSize);
    vs.Set("instanceOffset", this._CurrentFrameOffset());
    ps.Set("warpIntensity", this.warpIntensity);
    return { vs, ps };
  }

  /** The booster records for tests and tooling; live references. */
  GetSingleBoosters()
  {
    return this._singleBoosters;
  }

}


// EveChildBoosterSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
