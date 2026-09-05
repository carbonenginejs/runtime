// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet_Blue.cpp
//
// The attachment-side booster family (EveBoosterSet2 + renderable + trails)
// lives in eve/attachment/booster/; both sides share
// eve/attachment/booster/boosterUtilities.js.
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { withITr2Renderable } from "../../core/ITr2Renderable.js";
import { Tr2RenderBatch } from "../../core/batch/Tr2RenderBatch.js";
import {
  AddBoosterLights,
  CHILD_BOOSTER_BOX_BUFFER_NAME,
  CreateBoosterFlares,
  GenerateBoosterLightPhase,
  PadBoosterBoundingSphere
} from "../attachment/booster/boosterUtilities.js";

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
 * Placement comes entirely from Add() matrices - Carbon persists no items;
 * CarbonEngineJS persists them for document delivery and replays them on
 * Initialize.
 *
 * RENDERING SEAM: Carbon draws through the Tr2ChildBoosterInstanceData ring
 * buffer (global "ChildBoosterSetInstances", GPU buffer
 * "ChildBoosterSetInstanceBuffer", EveSpaceScene.cpp:261-262) - the AL
 * backend's lane. The CPU half packs the instance rows every async update;
 * without an installed ring buffer the frame offset stays INVALID and
 * GetBatches produces nothing, which is Carbon's own no-draw path for an
 * invalid offset (EveChildBoosterSet.cpp:478).
 */
@type.define({ className: "EveChildBoosterSet", family: "eve/child" })
export class EveChildBoosterSet extends withITr2Renderable(EveSpaceObjectChild)
{

  static DEFAULT_DRIVE_NAME = "ThrustMain";

  static WARP_DRIVE_NAME = "WarpState";

  static DEFAULT_EFFECT_PATH = "res:/Graphics/Effect/Managed/Space/Booster/ChildBoosterVolumetric.fx";

  @io.persist
  @type.boolean
  display = true;

  /** The biggest booster size of this set; runtime-derived. */
  @io.read
  @type.float32
  maxSize = 0;

  /** The warp factor of the ship; runtime toggle, not persisted. */
  @io.readwrite
  @type.float32
  warpIntensity = 0;

  /** The thrust of the ship; runtime toggle, not persisted. */
  @io.readwrite
  @type.float32
  thrust = 0;

  @io.notify
  @io.persist
  @type.float32
  glowScale = 1;

  @io.notify
  @io.persist
  @type.vec4
  glowColor = vec4.create();

  @io.notify
  @io.persist
  @type.float32
  symHaloScale = 1;

  @io.notify
  @io.persist
  @type.float32
  haloScaleX = 1;

  @io.notify
  @io.persist
  @type.float32
  haloScaleY = 1;

  @io.notify
  @io.persist
  @type.vec4
  haloColor = vec4.create();

  @io.notify
  @io.persist
  @type.vec4
  warpGlowColor = vec4.create();

  @io.notify
  @io.persist
  @type.vec4
  warpHaloColor = vec4.create();

  @io.persist
  @type.float32
  lightOffset = 0;

  @io.persist
  @type.float32
  lightFlickerAmplitude = 0;

  @io.persist
  @type.float32
  lightFlickerFrequency = 0;

  @io.persist
  @type.float32
  lightRadius = 0;

  @io.persist
  @type.vec4
  lightColor = vec4.create();

  @io.persist
  @type.float32
  lightWarpRadius = 0;

  @io.persist
  @type.vec4
  lightWarpColor = vec4.create();

  /** Controller name the booster observes for the thrust value. */
  @io.persist
  @type.string
  driveName = EveChildBoosterSet.DEFAULT_DRIVE_NAME;

  /** When false the flares draw even at booster-LOD distances. */
  @io.readwrite
  @type.boolean
  flareLodEnabled = true;

  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.persist
  @type.objectRef("Tr2Effect")
  effectFar = null;

  /** Sprite set rendering the glows on the boosters. */
  @io.persist
  @type.objectRef("EveSpriteSet")
  glows = null;

  /**
   * The authored exhaust placements. Carbon rebuilds these through SOF's
   * Add() calls and never persists them; CarbonEngineJS delivers built
   * objects as documents, so the items persist and Initialize replays them.
   */
  @io.persist
  @type.list("EveBoosterSet2Item")
  items = [];

  // Carbon m_singleBoosters (SingleBoosterData records).
  #singleBoosters = [];

  // The exact exhaust-point bounding sphere (positions only; padded in
  // GetBoundingSphere) plus Carbon's uninitialized sentinel as a flag.
  #boosterBoundingSphere = vec4.create();

  #boosterBoundingSphereInitialized = false;

  // The packed Tr2ChildBoosterInstanceData rows (CPU half of cpp:107-117).
  #instanceData = new Float32Array(0);

  #instanceDataU32 = new Uint32Array(0);

  #instanceCount = 0;

  // The AL ring buffer (Carbon's Tr2RingBuffer singleton) and this set's
  // per-consumer cursor (Carbon m_ringBufferOffsets, a Tr2RingBufferOffsets
  // value member, EveChildBoosterSet.h:229). Until the AL lane ships the
  // real classes the engine installs both; a null pair keeps the frame
  // offset INVALID and the set undrawn, exactly as Carbon's invalid ring
  // offset does.
  #ringBuffer = null;

  #ringBufferOffsets = null;

  #parentTransform = mat4.create();

  #parentScale = 1;

  #boosterHighLod = false;

  #boostersVisible = false;

  #glowsVisible = false;

  #isVisible = false;

  #hasUpdated = false;

  /** Replays authored items through Add (Carbon SOF calls Add directly). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon persists no items; document-delivered placements replay through Add here.")
  Initialize()
  {
    if (this.items.length && !this.#singleBoosters.length)
    {
      for (const item of this.items)
      {
        this.#AddSingleBooster(item.transform, item.atlasIndex0, item.atlasIndex1, item.lightScale);
      }
    }
    return true;
  }

  /** Rebuilds the flares when a glow-group field changes (Carbon cpp:77-93). */
  @carbon.method
  @impl.implemented
  OnModified(_value = null)
  {
    if (this.glows)
    {
      this.glows.Clear();
      for (const booster of this.#singleBoosters)
      {
        CreateBoosterFlares(this.glows, booster.transform, this.#GetFlareParams());
      }
      this.glows.Rebuild();
    }
    return true;
  }

  #GetFlareParams()
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
    this.#ringBuffer = ringBuffer ?? null;
    this.#ringBufferOffsets = this.#ringBuffer ? (ringBufferOffsets ?? null) : null;
  }

  /** The current ring frame offset, INVALID without an AL backend. */
  #CurrentFrameOffset()
  {
    return this.#ringBufferOffsets
      ? this.#ringBufferOffsets.GetCurrentFrameOffset()
      : INVALID_RING_OFFSET;
  }

  /** The packed instance rows and lane count for the AL upload. */
  GetInstanceBufferData()
  {
    return {
      data: this.#instanceData.subarray(0, this.#instanceCount * CHILD_BOOSTER_INSTANCE_STRIDE),
      count: this.#instanceCount,
      stride: CHILD_BOOSTER_INSTANCE_STRIDE
    };
  }

  /**
   * Async update (Carbon cpp:101-131): packs the visible instance rows
   * (Float4x3 COLUMN-stride transform + intensity + wavePhase + atlas
   * indices), uploads them when a ring buffer is installed, and caches the
   * parent transform and its largest-axis scale.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Ring-buffer AdvanceFrame/UploadTransforms are the AL backend's; the CPU packs the rows and the offset stays INVALID (Carbon's own no-draw state) until a ring buffer is installed.")
  UpdateAsyncronous(_updateContext = null, params = null)
  {
    // Carbon cpp:103; the offsets cursor owns its methods - nullability is
    // state, method existence is contract.
    if (this.#ringBufferOffsets)
    {
      this.#ringBufferOffsets.AdvanceFrame();
    }

    if (params?.isVisible)
    {
      const lanes = this.#singleBoosters.length * CHILD_BOOSTER_INSTANCE_STRIDE;
      if (this.#instanceData.length < lanes)
      {
        this.#instanceData = new Float32Array(lanes);
        this.#instanceDataU32 = new Uint32Array(this.#instanceData.buffer);
      }
      let lane = 0;
      for (const booster of this.#singleBoosters)
      {
        const transform = booster.transform;
        // Float4x3 rows are the transpose's rows: (m0 m4 m8 m12) ...
        this.#instanceData[lane + 0] = transform[0];
        this.#instanceData[lane + 1] = transform[4];
        this.#instanceData[lane + 2] = transform[8];
        this.#instanceData[lane + 3] = transform[12];
        this.#instanceData[lane + 4] = transform[1];
        this.#instanceData[lane + 5] = transform[5];
        this.#instanceData[lane + 6] = transform[9];
        this.#instanceData[lane + 7] = transform[13];
        this.#instanceData[lane + 8] = transform[2];
        this.#instanceData[lane + 9] = transform[6];
        this.#instanceData[lane + 10] = transform[10];
        this.#instanceData[lane + 11] = transform[14];
        this.#instanceData[lane + 12] = this.thrust;
        this.#instanceData[lane + 13] = booster.wavePhase;
        this.#instanceDataU32[lane + 14] = booster.atlasIndex0;
        this.#instanceDataU32[lane + 15] = booster.atlasIndex1;
        lane += CHILD_BOOSTER_INSTANCE_STRIDE;
      }
      this.#instanceCount = this.#singleBoosters.length;

      if (this.#ringBuffer && this.#ringBufferOffsets)
      {
        // Carbon cpp:118: offsets.UploadTransforms(ring, data, count) is
        // void; the frame offset is read back from the cursor.
        this.#ringBufferOffsets.UploadTransforms(
          this.#ringBuffer, this.GetInstanceBufferData().data, this.#instanceCount);
      }
    }

    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      mat4.copy(this.#parentTransform, parentTransform);
    }

    // Scale with the highest axis factor - single sqrt of the max squared
    // basis-row length (Carbon cpp:123-128; keep the shape).
    const scaleXSq = this.#parentTransform[0] ** 2 + this.#parentTransform[1] ** 2 + this.#parentTransform[2] ** 2;
    const scaleYSq = this.#parentTransform[4] ** 2 + this.#parentTransform[5] ** 2 + this.#parentTransform[6] ** 2;
    const scaleZSq = this.#parentTransform[8] ** 2 + this.#parentTransform[9] ** 2 + this.#parentTransform[10] ** 2;
    this.#parentScale = Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));

    this.#hasUpdated = true;
  }

  /** Clears every booster, the glows and the bounds (Carbon cpp:142-157). */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.#singleBoosters.length = 0;
    if (this.glows) this.glows.Clear();
    this.maxSize = 0;
    this.#boosterBoundingSphereInitialized = false;
    vec4.set(this.#boosterBoundingSphere, 0, 0, 0, 0);
    this.#instanceCount = 0;
  }

  /**
   * Adds one exhaust point (Carbon cpp:160-192): light position pushed back
   * along -Z by lightOffset THROUGH the local matrix, radius from the larger
   * XY basis scale, a random flicker phase and wave phase, flares when a
   * glow set exists, and bounds/max-size growth. SetLightData and SetGlow
   * must run before Add - SOF respects that order.
   */
  @carbon.method
  @impl.implemented
  Add(localMatrix, atlasIndex0, atlasIndex1, lightScale = 1)
  {
    this.#AddSingleBooster(localMatrix, atlasIndex0, atlasIndex1, lightScale);
  }

  #AddSingleBooster(localMatrix, atlasIndex0, atlasIndex1, lightScale)
  {
    const transform = mat4.clone(localMatrix);
    const scale = Math.max(
      Math.hypot(transform[0], transform[1], transform[2]),
      Math.hypot(transform[4], transform[5], transform[6])
    );
    const booster = {
      transform,
      lightPosition: vec3.transformMat4(vec3.create(), [ 0, 0, -this.lightOffset ], transform),
      lightRadius: scale * Number(lightScale),
      lightPhase: GenerateBoosterLightPhase(),
      atlasIndex0: Number(atlasIndex0) >>> 0,
      atlasIndex1: Number(atlasIndex1) >>> 0,
      wavePhase: Math.random()
    };
    this.#singleBoosters.push(booster);

    if (this.glows)
    {
      CreateBoosterFlares(this.glows, booster.transform, this.#GetFlareParams());
    }

    // Exact positions only - the exhaust size padding happens in
    // GetBoundingSphere (Carbon's warning comment, cpp:183-186).
    this.#IncludeBoundingPoint(transform[12], transform[13], transform[14]);

    if (scale > this.maxSize)
    {
      this.maxSize = scale;
    }
  }

  /** Carbon BoundingSphereUpdate: grow the exact sphere to include a point. */
  #IncludeBoundingPoint(x, y, z)
  {
    const sphere = this.#boosterBoundingSphere;
    if (!this.#boosterBoundingSphereInitialized)
    {
      this.#boosterBoundingSphereInitialized = true;
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  SetEffect(effect, effectFar)
  {
    this.effect = effect ?? null;
    this.effectFar = effectFar ?? null;
  }

  /** Sets the glow sprite set (Carbon cpp:247-250). */
  @carbon.method
  @impl.implemented
  SetGlow(glow)
  {
    this.glows = glow ?? null;
  }

  /** Sets the controller name observed for the thrust value (Carbon cpp:396-399). */
  @carbon.method
  @impl.implemented
  SetDriveName(driveName)
  {
    this.driveName = String(driveName ?? "");
  }

  /**
   * Frame visibility (Carbon cpp:286-319): uses the CACHED parent transform
   * from the async update, not the passed one - booster LOD from twice the
   * padded sphere's pixel size, plus the glow set's own visibility pass.
   */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, _parentTransform = null, _parentLod = 0)
  {
    this.#glowsVisible = false;
    this.#isVisible = false;
    this.#boostersVisible = false;

    if (!this.#hasUpdated) return false;

    if (this.display)
    {
      this.GetBoundingSphere(SPHERE_SCRATCH);
      const frustum = typeof updateContext?.GetFrustum === "function"
        ? updateContext.GetFrustum()
        : updateContext?.frustum;
      if (!frustum) return this.#isVisible;

      const boosterLod = 2 * frustum.GetPixelSizeAccross(SPHERE_SCRATCH);
      const mediumThreshold = Number(updateContext.GetMediumDetailThreshold?.() ?? updateContext.mediumDetailThreshold ?? 0);
      const lowThreshold = Number(updateContext.GetLowDetailThreshold?.() ?? updateContext.lowDetailThreshold ?? 0);
      this.#boosterHighLod = boosterLod > mediumThreshold * 1.5;
      this.#boostersVisible = boosterLod > lowThreshold;
      this.#isVisible = !!frustum.IsSphereVisible(SPHERE_SCRATCH);

      if (this.glows && this.glows.UpdateVisibility(updateContext, this.#parentTransform, null, 0))
      {
        this.#glowsVisible = true;
      }
    }
    return this.#isVisible;
  }

  /** Adds this set as a renderable when displayed, lit and visible (Carbon cpp:330-343). */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables)
  {
    if (!this.display) return renderables;
    if (this.effect && this.#isVisible)
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
  @carbon.method
  @impl.implemented
  GetBoundingSphere(sphere = vec4.create(), _query = 0)
  {
    if (!this.#hasUpdated) return false;
    PadBoosterBoundingSphere(sphere, this.#boosterBoundingSphere, this.#parentTransform);
    sphere[3] *= this.#parentScale;
    return true;
  }

  /** Forwards quad registration to the glow set (Carbon cpp:368-374). */
  @carbon.method
  @impl.adapted
  @impl.reason("EveSpriteSet's quad-renderer surface is engine-owned and not yet ported; the forward stops at that seam.")
  RegisterWithQuadRenderer(quadRenderer)
  {
    this.glows?.RegisterWithQuadRenderer?.(quadRenderer);
  }

  /** Forwards glow quads when visible and past flare LOD (Carbon cpp:383-394). */
  @carbon.method
  @impl.adapted
  @impl.reason("EveSpriteSet.AddBoosterGlowToQuadRenderer is engine-owned and not yet ported; the CPU gating is Carbon's.")
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.glows || !this.#glowsVisible || !this.display) return;
    if (this.#boostersVisible || !this.flareLodEnabled)
    {
      this.glows.AddBoosterGlowToQuadRenderer?.(
        quadRenderer, this.#parentTransform, this.thrust, this.warpIntensity);
    }
    void frustum;
  }

  /**
   * The flickering booster point lights (Carbon cpp:416-440): gated on the
   * first update, a usable radius and positive thrust; radii pre-multiplied
   * by the parent scale - EveBoosterSet2 deliberately does NOT.
   */
  @carbon.method
  @impl.implemented
  GetLights(lightManager)
  {
    if (!this.#hasUpdated) return;
    if (this.lightRadius <= 0 && this.lightWarpRadius <= 0) return;
    if (this.thrust <= 0) return;
    if (!lightManager) return;

    const params = {
      lightWarpRadius: this.lightWarpRadius * this.#parentScale,
      lightWarpColor: this.lightWarpColor,
      lightRadius: this.lightRadius * this.#parentScale,
      lightColor: this.lightColor,
      lightFlickerAmplitude: this.lightFlickerAmplitude,
      lightFlickerFrequency: this.lightFlickerFrequency
    };
    const time = lightManager.GetAnimationTime() ?? 0;
    AddBoosterLights(
      lightManager, this.#singleBoosters, this.#parentTransform,
      this.thrust, this.warpIntensity, params, time);
  }

  /** Thrust from the observed drive controller, warp from WarpState (Carbon cpp:442-452). */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Fixed additive sort value (Carbon cpp:522-525). */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 1;
  }

  /**
   * Emits the instanced booster batch (Carbon cpp:468-516): additive-only,
   * gated on display, a VALID ring offset, and a non-empty set; the LOD
   * chooses effect vs effectFar. 36 indices per instance over the shared
   * child-booster box.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The procedural box vertex buffer, quad-list index buffer and vertex declaration are engine realizations; the batch carries the material, per-object data, draw arguments and the shared buffer name.")
  GetBatches(batches, batchType, perObjectData = null)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE) return;
    if (!this.display) return;
    if (this.#CurrentFrameOffset() === INVALID_RING_OFFSET) return;
    if (!this.#singleBoosters.length) return;
    if (!this.#boostersVisible) return;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial((this.#boosterHighLod || !this.effectFar) ? this.effect : this.effectFar);
    batch.SetPerObjectData(perObjectData);
    batch.SetDrawIndexedInstanced(3 * 2 * 6, this.#singleBoosters.length, 0, 0, 0);
    batch.proceduralVertexBufferName = CHILD_BOOSTER_BOX_BUFFER_NAME;
    batches.Commit(batch);
  }

  /**
   * Fills the child-booster per-object records (Carbon cpp:533-557): the
   * LOGICAL parent transform through SetAndTranspose, the max booster size,
   * the ring frame offset, and the warp intensity.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's struct fill becomes the registered EveChildBoosterSet RawData layouts; the instanceOffset lane carries the AL ring offset when one is installed.")
  GetPerObjectData(accumulator = null)
  {
    if (typeof accumulator?.Alloc !== "function") return null;
    const vs = accumulator.Alloc("EveChildBoosterSetVSData");
    const ps = accumulator.Alloc("EveChildBoosterSetPSData");
    vs.SetAndTranspose("worldMatrix", this.#parentTransform);
    vs.Set("maxBoosterSize", this.maxSize);
    vs.Set("instanceOffset", this.#CurrentFrameOffset());
    ps.Set("warpIntensity", this.warpIntensity);
    return { vs, ps };
  }

  /** The booster records for tests and tooling; live references. */
  GetSingleBoosters()
  {
    return this.#singleBoosters;
  }

}

