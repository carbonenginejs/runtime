// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2_Blue.cpp
import { IsMatch } from "#blue";
import { mat4 } from "#math/mat4";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { IInitialize } from "#blue/IInitialize";
import { INotify } from "#blue/INotify";
import { EveEntity } from "../../EveEntity.js";
import { EveBoosterSet2SingleBoosterData } from "./EveBoosterSet2SingleBoosterData.js";
import { EveBoosterSet2Renderable } from "./EveBoosterSet2Renderable.js";
import { EveComponentType } from "../../EntityComponents.js";
import { TriStorageFlags } from "#consts/graphics";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { TriDevice } from "../../../core/device/TriDevice.js";
import { Tr2SuballocatedBufferAllocation } from "../../../core/device/Tr2SuballocatedBuffer/index.js";
import { SharedGeometryBuffer } from "../../../core/mesh/TriGeometryResAllocations.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { TR2SHADERMODEL } from "#consts/graphics";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import {
  AddBoosterLights,
  CreateBoosterFlares,
  GenerateBoosterLightPhase,
  MakeBoosterBoxBuffer,
  MakeBoosterStarBuffer
} from "./boosterUtilities.js";


/**
 * Owns a hull's booster records and derives from them the glow
 * flares, trails, set bounding sphere and flickering point lights that its
 * renderable instances draw.
 */
@meta.define({ className: "EveBoosterSet2", family: "eve/attachment/boosters" })
@meta.blue.inherit(INotify, IInitialize)
@meta.blue.interface(INotify, IInitialize, EveEntity)
export class EveBoosterSet2 extends EveEntity
{

  /** m_flareLodEnabled (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  flareLodEnabled = true;

  /** m_staticTrailLength (float) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  staticTrailLength = 0;

  /** m_trailsStaticOffsets[0] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  trailsStaticOffsets0 = vec3.create();

  /** m_trailsStaticOffsets[1] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  trailsStaticOffsets1 = vec3.create();

  /** m_trailsStaticOffsets[2] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  trailsStaticOffsets2 = vec3.create();

  /** m_trailsStaticOffsets[3] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  trailsStaticOffsets3 = vec3.create();

  /** m_trailsStaticOffsets[4] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  trailsStaticOffsets4 = vec3.create();

  /** m_lightOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightOffset = 0;

  /** m_lightFlickerAmplitude (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightFlickerAmplitude = 0;

  /** m_lightFlickerFrequency (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightFlickerFrequency = 0;

  /** m_lightRadius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightRadius = 0;

  /** m_lightColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  lightColor = vec4.create();

  /** m_lightWarpRadius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightWarpRadius = 0;

  /** m_lightWarpColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  lightWarpColor = vec4.create();

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_alwaysOnIntensity (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  alwaysOnIntensity = 1;

  /** m_warpGlowColor (Color) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  warpGlowColor = vec4.create();

  /** m_glowColor (Color) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  glowColor = vec4.create();

  /** m_haloColor (Color) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  haloColor = vec4.create();

  /** m_warpHaloColor (Color) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  warpHaloColor = vec4.create();

  /** m_effectFar (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("Tr2Effect")
  effectFar = null;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("Tr2Effect")
  effect = null;

  /** m_boosterRenderables (PEveBoosterSet2RenderableVector) [READ] */
  @meta.blue.read
  @meta.type.list("EveBoosterSet2Renderable")
  instances = [];

  /** m_maxVel (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  maxVel = 250;

  /** m_glowScale (float) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  glowScale = 1;

  /** m_symHaloScale (float) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  symHaloScale = 1;

  /** m_haloScaleX (float) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  haloScaleX = 1;

  /** m_haloScaleY (float) [READWRITE, PERSIST, NOTIFY] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  haloScaleY = 1;

  /** m_trailsSmoothing (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  trailsSmoothing = 10;

  /** m_glows (EveSpriteSetPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("EveSpriteSet")
  glows = null;

  /** m_maxSize (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  maxSize = 0;

  /** m_boosterBoundingSphere.xyz (Vector4) [READ] */
  @meta.blue.read
  @meta.type.vec3
  boosterBoundingSphereCenter = vec3.create();

  /** m_boosterBoundingSphere.w (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  boosterBoundingSphereRadius = 0;

  /** m_warpIntensity (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  warpIntensity = 0;

  /** m_physicsUpdate (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  physicsUpdate = true;

  /** m_destinyUpdate (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  destinyUpdate = true;

  /** m_alwaysOn (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  alwaysOn = false;

  /** m_trails (EveTrailsSetPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("EveTrailsSet")
  trails = null;

  /**
   * m_singleBoosters (h:284); read by the friend EveBoosterSet2Renderable.
   * Carbon does not map it; it persists here so values carry the boosters,
   * and Initialize derives the flares, bounds and max size from it.
   */
  @meta.blue.persistOnly
  @meta.type.list("EveBoosterSet2SingleBoosterData")
  _singleBoosters = [];

  /** m_vertexDeclHandle (h:304) */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_vertexBuffer (h:306): the box, as Carbon's constructor makes it (cpp:613). */
  _vertexBuffer = MakeBoosterBoxBuffer();

  /** m_instanceBuffer (h:307): invalid until RebuildInstanceData. */
  _instanceBuffer = new Tr2SuballocatedBufferAllocation();

  _revision = 0;

  /** m_glowsVisible (cpp:682) - starts visible, recomputed by UpdateVisibility. */
  _glowsVisible = true;

  /**
   * Registers with the device, as Carbon's Tr2DeviceResource base does
   * (Tr2DeviceResource.cpp:10-13), so a set built before the device exists is
   * prepared when it comes up. JavaScript has no destructor, so the set is
   * never unregistered.
   */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /** Carbon g_eveSpaceObjectTrailsEnabled (cpp:31-32), a registered engine setting: trails update and draw. */
  @meta.setting("eveSpaceObjectTrailsEnabled")
  static eveSpaceObjectTrailsEnabled = true;

  /** g_eveSpaceObjectTrailsMinLength (cpp:34-35): below this trail length, in metres, a trail is not drawn. */
  @meta.setting("eveSpaceObjectTrailsMinLength")
  static eveSpaceObjectTrailsMinLength = 200;

  /** g_eveSpaceObjectTrailsMinLengthFade (cpp:36-37): the length over which a trail fades in above the minimum. */
  @meta.setting("eveSpaceObjectTrailsMinLengthFade")
  static eveSpaceObjectTrailsMinLengthFade = 1000;

  /** g_eveSpaceObjectTrailsMaxLength (cpp:39-40): above this trail length a trail is not drawn. */
  @meta.setting("eveSpaceObjectTrailsMaxLength")
  static eveSpaceObjectTrailsMaxLength = 50000;

  /** g_eveSpaceObjectTrailsMaxLengthFade (cpp:41-42): the length over which a trail fades out below the maximum. */
  @meta.setting("eveSpaceObjectTrailsMaxLengthFade")
  static eveSpaceObjectTrailsMaxLengthFade = 20000;

  /**
   * Carbon Initialize (cpp:654-658) prepares the device resources.
   *
   * Adapted: a set whose boosters arrived as records rather than through Add
   * derives what Add derives from them: the flares, the bounding sphere and
   * the max size. Every renderable instance is bound back to this set.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    if (this._singleBoosters.length) EveBoosterSet2._DeriveFromBoosters(this);
    for (const renderable of this.instances)
    {
      renderable.SetBoosterSet(this);
    }
    this._revision++;
    this.PrepareResources();
    return true;
  }

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32). */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      if (!this.OnPrepareResources()) return false;
    }
    return true;
  }

  /**
   * Carbon EveBoosterSet2::ReleaseResources (cpp:891-895).
   *
   * Adapted: Tr2SuballocatedBuffer has no Free, so the instance allocation is dropped rather than returned to the
   * shared buffer.
   */
  @meta.blue.method
  @meta.adapted
  ReleaseResources(_storage)
  {
    this._instanceBuffer = new Tr2SuballocatedBufferAllocation();
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /**
   * Carbon EveBoosterSet2::OnPrepareResources (cpp:902-950): the instanced
   * vertex declaration, the box or star by shader model, and the instance
   * buffer.
   */
  @meta.blue.method
  @meta.implemented
  OnPrepareResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(EveBoosterSet2._BoosterInstancedVertex());
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;

    this._vertexBuffer = Tr2Renderer.GetShaderModel() >= TR2SHADERMODEL.TR2SM_3_0_HI
      ? MakeBoosterBoxBuffer()
      : MakeBoosterStarBuffer();

    this.RebuildInstanceData(Tr2RenderContext_GetMainThreadRenderContext());

    // cpp:945-948
    this.trails?.PrepareResources();
    return true;
  }

  /**
   * Carbon EveBoosterSet2::RebuildInstanceData (cpp:955-985): one 92-byte
   * InstanceVertex per booster (h:221-228) - transform, functionality,
   * wavePhase, atlasIndex0, atlasIndex1. Carbon's Matrix and gl-matrix share
   * the byte layout, so the transform copies straight across.
   *
   * Adapted: Tr2SuballocatedBuffer has no Free, so the previous allocation is dropped rather than returned.
   */
  @meta.blue.method
  @meta.adapted
  RebuildInstanceData(renderContext)
  {
    this._instanceBuffer = new Tr2SuballocatedBufferAllocation();

    const boosterCount = this._singleBoosters.length;
    if (!boosterCount) return;

    const vertices = new Float32Array(boosterCount * 23);
    for (let index = 0; index < boosterCount; index++)
    {
      const booster = this._singleBoosters[index];
      const at = index * 23;
      vertices.set(booster.transform, at);
      vertices.set(booster.functionality, at + 16);
      // (float)rand() / (float)RAND_MAX
      vertices[at + 20] = Math.random();
      vertices[at + 21] = booster.atlasIndex0;
      vertices[at + 22] = booster.atlasIndex1;
    }

    const allocation = SharedGeometryBuffer(renderContext).Allocate(92, boosterCount, vertices, renderContext);
    if (allocation) this._instanceBuffer = allocation;
  }

  /** Carbon's function-local static s_boosterInstancedVertex (cpp:906-919). */
  static _BoosterInstancedVertex()
  {
    if (!EveBoosterSet2._boosterInstancedVertex)
    {
      const vd = new Tr2VertexDefinition();
      vd.Add("FLOAT32_3", "POSITION");
      vd.Add("FLOAT32_2", "TEXCOORD", 0);
      // stream 1
      vd.Add("FLOAT32_4", "TEXCOORD", 1, 1, 1);
      vd.Add("FLOAT32_4", "TEXCOORD", 2, 1, 1);
      vd.Add("FLOAT32_4", "TEXCOORD", 3, 1, 1);
      vd.Add("FLOAT32_4", "TEXCOORD", 4, 1, 1);
      vd.Add("FLOAT32_4", "TEXCOORD", 5, 1, 1);
      vd.Add("FLOAT32_1", "TEXCOORD", 6, 1, 1);
      vd.Add("FLOAT32_2", "TEXCOORD", 7, 1, 1);
      EveBoosterSet2._boosterInstancedVertex = vd;
    }
    return EveBoosterSet2._boosterInstancedVertex;
  }

  static _boosterInstancedVertex = null;

  /**
   * Applies the changed member's native flare/trail consequence and advances
   * the CPU revision.
   *
   * Adapted: Member names replace native addresses; the CPU revision is ours.
   */
  @meta.blue.method
  @meta.adapted
  @meta.invalidates("#revision")
  OnModified(propertyName)
  {
    if (this.glows)
    {
      if (IsMatch(propertyName, "glowScale") || IsMatch(propertyName, "haloScaleX")
        || IsMatch(propertyName, "haloScaleY") || IsMatch(propertyName, "symHaloScale")
        || IsMatch(propertyName, "glowColor") || IsMatch(propertyName, "warpGlowColor")
        || IsMatch(propertyName, "haloColor") || IsMatch(propertyName, "warpHaloColor"))
      {
        this.glows.Clear();
        for (const booster of this._singleBoosters)
        {
          CreateBoosterFlares(this.glows, booster.transform, EveBoosterSet2._GetFlareParams(this));
        }
        this.glows.Rebuild();
      }
      if (IsMatch(propertyName, "staticTrailLength"))
      {
        EveBoosterSet2._UpdateStaticTrailOffsets(this);
      }
    }
    this._revision++;
    return true;
  }

  /**
   * Resizes the renderable instance list - one instance per ship drawing this
   * booster set - keeping at least one, and rebinds every instance; returns the
   * resulting count.
   */
  @meta.blue.method
  @meta.implemented
  SetCount(count)
  {
    const requested = Math.trunc(Number(count));
    const target = Number.isFinite(requested) ? Math.max(1, requested) : 1;
    if (this.instances.length > target)
    {
      this.instances.length = target;
    }
    while (this.instances.length < target)
    {
      const renderable = new EveBoosterSet2Renderable();
      renderable.SetBoosterSet(this);
      this.instances.push(renderable);
    }
    for (const renderable of this.instances)
    {
      renderable.SetBoosterSet(this);
    }
    this._revision++;
    return this.instances.length;
  }

  /**
   * Updates one renderable instance from the parent's transform, speed,
   * acceleration and rotation, creating the first instance when the set has
   * none; returns false when boosterInstance is out of range.
   */
  @meta.blue.method
  @meta.adapted
  Update(
    deltaTime,
    time,
    parentMatrix = mat4.create(),
    parentSpeed = 0,
    parentAcceleration = EveBoosterSet2._zero,
    parentRotation = EveBoosterSet2._identityRotation,
    boosterInstance = 0
  )
  {
    if (!this.instances.length)
    {
      this.SetCount(1);
    }
    const index = Number(boosterInstance) >>> 0;
    if (index >= this.instances.length)
    {
      return false;
    }
    this.instances[index].Update(
      deltaTime,
      time,
      parentMatrix,
      parentSpeed,
      parentAcceleration,
      parentRotation
    );
    return true;
  }

  /**
   * Advances every instance's trail spline and then the trail set itself;
   * returns false when no trail set is attached.
   */
  @meta.blue.method
  @meta.adapted
  UpdateTrails(deltaTime, time)
  {
    // cpp:729: trails advance only while the setting is on.
    if (!this.trails || !EveBoosterSet2.eveSpaceObjectTrailsEnabled)
    {
      return false;
    }
    let updated = false;
    for (const renderable of this.instances)
    {
      updated = renderable.UpdateTrails(deltaTime, time) || updated;
    }
    this.trails.Update(time);
    return updated;
  }

  /**
   * Carbon Clear (cpp:748-767): drops the boosters, their glows and trails and
   * the bounding sphere, and releases the device resources. Carbon leaves the
   * max size as it was.
   */
  @meta.blue.method
  @meta.implemented
  Clear()
  {
    this._singleBoosters.length = 0;
    this.glows?.Clear();
    this.trails?.Clear();
    vec3.set(this.boosterBoundingSphereCenter, 0, 0, 0);
    this.boosterBoundingSphereRadius = 0;
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    this._revision++;
  }

  /**
   * Carbon Add (cpp:770-814): records one booster - its light position pushed
   * back along -Z by lightOffset, its light radius from the larger X/Y basis
   * length, a random flicker phase - then creates its flares, its trail when
   * hasTrail (offset back half a unit along the booster axis), and grows the
   * bounding sphere and max size. Throws a TypeError when localMatrix is not
   * sixteen values.
   */
  @meta.blue.method
  @meta.implemented
  Add(
    localMatrix,
    functionality,
    hasTrail,
    atlasIndex0,
    atlasIndex1,
    lightScale = 1
  )
  {
    if (!localMatrix || localMatrix.length !== 16)
    {
      throw new TypeError("EveBoosterSet2 transforms must contain 16 values");
    }
    const booster = new EveBoosterSet2SingleBoosterData();
    mat4.copy(booster.transform, localMatrix);
    vec4.copy(booster.functionality, functionality ?? EveBoosterSet2._defaultFunctionality);
    vec3.transformMat4(booster.lightPosition, [0, 0, -this.lightOffset], booster.transform);
    const scale = EveBoosterSet2._GetBoosterScale(booster.transform);
    booster.lightRadius = scale * Number(lightScale);
    booster.lightPhase = GenerateBoosterLightPhase();
    booster.atlasIndex0 = Number(atlasIndex0) >>> 0;
    booster.atlasIndex1 = Number(atlasIndex1) >>> 0;
    this._singleBoosters.push(booster);

    if (this.glows)
    {
      CreateBoosterFlares(this.glows, booster.transform, EveBoosterSet2._GetFlareParams(this));
    }
    if (this.trails && hasTrail)
    {
      const offset = mat4.clone(booster.transform);
      offset[12] -= offset[8] * 0.5;
      offset[13] -= offset[9] * 0.5;
      offset[14] -= offset[10] * 0.5;
      this.trails.Add(offset, scale);
    }

    EveBoosterSet2._UpdateBoundingSphere(this, booster.transform.subarray(12, 15));
    if (scale > this.maxSize) this.maxSize = scale;
    this._revision++;
  }

  /**
   * Re-derives from the booster records what Add derives beside them: the
   * flares (cleared and recreated), the bounding sphere and the max size.
   * The trails keep their own records.
   */
  static _DeriveFromBoosters(owner)
  {
    if (owner.glows)
    {
      owner.glows.Clear();
      for (const booster of owner._singleBoosters)
      {
        CreateBoosterFlares(owner.glows, booster.transform, EveBoosterSet2._GetFlareParams(owner));
      }
      owner.glows.Rebuild();
    }
    vec3.set(owner.boosterBoundingSphereCenter, 0, 0, 0);
    owner.boosterBoundingSphereRadius = 0;
    owner.maxSize = 0;
    for (const booster of owner._singleBoosters)
    {
      EveBoosterSet2._UpdateBoundingSphere(owner, booster.transform.subarray(12, 15));
      owner.maxSize = Math.max(owner.maxSize, EveBoosterSet2._GetBoosterScale(booster.transform));
    }
  }

  /** The larger of a booster transform's X and Y basis lengths (cpp:785). */
  static _GetBoosterScale(transform)
  {
    return Math.max(
      Math.hypot(transform[0], transform[1], transform[2]),
      Math.hypot(transform[4], transform[5], transform[6])
    );
  }

  /**
   * Sets the whole flare description in one call: glow and halo scales with
   * their normal and warp colours, plus the always-on flag.
   */
  @meta.blue.method
  @meta.implemented
  SetData(
    glowScale,
    glowColor,
    warpGlowColor,
    symHaloScale,
    haloScaleX,
    haloScaleY,
    haloColor,
    warpHaloColor,
    alwaysOn
  )
  {
    this.glowScale = Number(glowScale);
    vec4.copy(this.glowColor, glowColor);
    vec4.copy(this.warpGlowColor, warpGlowColor);
    this.symHaloScale = Number(symHaloScale);
    this.haloScaleX = Number(haloScaleX);
    this.haloScaleY = Number(haloScaleY);
    vec4.copy(this.haloColor, haloColor);
    vec4.copy(this.warpHaloColor, warpHaloColor);
    this.alwaysOn = !!alwaysOn;
  }

  /**
   * Sets the whole booster point-light description in one call: light offset,
   * flicker amplitude and frequency, and the normal and warp radius and colour.
   */
  @meta.blue.method
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

  /**
   * Sets the near and far booster effects; the renderable's boosterHighLod flag
   * picks between them at draw time.
   */
  @meta.blue.method
  @meta.implemented
  SetEffect(effect, effectFar)
  {
    this.effect = effect ?? null;
    this.effectFar = effectFar ?? null;
  }

  /**
   * Attaches the sprite set that the per-booster flares are added to; without
   * one no flares are created.
   */
  @meta.blue.method
  @meta.implemented
  SetGlow(glow)
  {
    this.glows = glow ?? null;
  }

  /**
   * Attaches the trails set that per-booster trails are added to; without one no
   * trails are created.
   */
  @meta.blue.method
  @meta.implemented
  SetTrail(trail)
  {
    this.trails = trail ?? null;
  }

  /**
   * Carbon's GetBoosterIntensity(): the mean intensity across every renderable
   * instance; zero when the set has none (EveBoosterSet2.cpp:1048).
   * @returns {number}
   */
  @meta.blue.method
  @meta.implemented
  GetBoosterIntensity()
  {
    let intensity = 0;
    const oneOverCount = 1 / this.instances.length;
    for (const renderable of this.instances)
    {
      intensity += renderable.GetIntensity() * oneOverCount;
    }
    return intensity;
  }

  /**
   * Carbon's GetBoosterIntensity( int index ): one renderable instance's
   * intensity, zero when the index is out of range (EveBoosterSet2.cpp:1067).
   * @param {number} index Renderable instance index.
   * @returns {number}
   */
  @meta.implemented
  GetBoosterIntensity__Index(index)
  {
    const renderable = this.instances[index >>> 0];
    return renderable ? renderable.GetIntensity() : 0;
  }

  /** The union of every renderable's world bounding sphere. Carbon has no
   * set-level equivalent (each renderable answers for itself); `out` is
   * required so a caller can keep its own scratch. An empty set leaves `out`
   * empty (sph3 radius -1) rather than reporting a zero-radius sphere at the
   * origin.
   *
   * Adapted: Carbon EveBoosterSet2.cpp:1115–1124 aggregates renderable spheres; JS writes the result to the caller's
   * output array.
   */
  @meta.blue.method
  @meta.adapted
  GetBoundingSphere(out)
  {
    sph3.empty(out);
    for (const renderable of this.instances)
    {
      if (renderable?.GetBoundingSphere)
      {
        renderable.GetBoundingSphere(EveBoosterSet2._sphereScratch);
        sph3.union(out, out, EveBoosterSet2._sphereScratch);
      }
    }
    return out;
  }

  /**
   * The derived runtime boosters as deep copies - transform, functionality,
   * light position, radius and phase, and atlas indices - safe for an
   * adapter to keep.
   */
  @meta.blue.method
  @meta.adapted
  GetBoosterData()
  {
    return this._singleBoosters.map(booster => ({
      transform: mat4.clone(booster.transform),
      functionality: vec4.clone(booster.functionality),
      lightPosition: vec3.clone(booster.lightPosition),
      lightRadius: booster.lightRadius,
      lightPhase: booster.lightPhase,
      atlasIndex0: booster.atlasIndex0,
      atlasIndex1: booster.atlasIndex1
    }));
  }

  /**
   * A counter bumped whenever the boosters or the instance list change, so
   * an adapter can tell its packed data is stale.
   */
  @meta.blue.method
  @meta.implemented
  GetRevision()
  {
    return this._revision;
  }

  /**
   * Carbon EveBoosterSet2::UpdateVisibility (EveBoosterSet2.cpp:988-1009): a display gate, then per-renderable LOD,
   * then ONE glow test - the loop breaks on the first renderable whose glow sprite set is on screen, so
   * m_glowsVisible is a whole-set flag, not per booster. Booster glows are placed by each renderable's parent
   * transform (its locator), not a bone, so no bone palette is passed (cpp:1001).
   *
   * Adapted: returns m_glowsVisible; Carbon returns void.
   * @returns {boolean} whether a glow is on screen
   */
  @meta.blue.method
  @meta.adapted
  UpdateVisibility(updateContext)
  {
    this._glowsVisible = false;
    if (this.display)
    {
      for (const renderable of this.instances)
      {
        renderable.UpdateVisibility(updateContext);
      }
      if (this.glows)
      {
        for (const renderable of this.instances)
        {
          if (this.glows.UpdateVisibility(updateContext, renderable.GetParentTransform(), null, 0))
          {
            this._glowsVisible = true;
            break;
          }
        }
      }
    }
    return this._glowsVisible;
  }

  /**
   * Carbon EveBoosterSet2::RegisterWithQuadRenderer (EveBoosterSet2.cpp:1132-1138): registers the glow sprites.
   * @param {Tr2QuadRenderer} quadRenderer
   */
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.glows)
    {
      this.glows.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /**
   * Carbon EveBoosterSet2::AddToQuadRenderer (EveBoosterSet2.cpp:1147-1160): one glow per booster instance, at its
   * own parent transform and intensity, while the glows are on screen and the instance passed flare LOD (or flare
   * LOD is off). Carbon does not read world: each instance carries its own transform.
   * @param {Tr2QuadRenderer} quadRenderer
   * @param {mat4} _world - the parent's world transform
   */
  @meta.implemented
  AddToQuadRenderer(quadRenderer, _world)
  {
    if (!this.glows || !this._glowsVisible || !this.display)
    {
      return;
    }

    for (const renderable of this.instances)
    {
      if (renderable.boostersVisible || !this.flareLodEnabled)
      {
        this.glows.AddBoosterGlowToQuadRenderer(quadRenderer, renderable.GetParentTransform(), renderable.overallIntensity, this.warpIntensity);
      }
    }
  }

  /** Carbon EveBoosterSet2::GetRenderables (cpp:1130-1145): gated on display
   * AND on the set owning an effect, then delegated to each renderable's own
   * visibility. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    if (!this.display || !this.effect)
    {
      return out;
    }
    for (const renderable of this.instances)
    {
      renderable.GetRenderables(out);
    }
    return out;
  }

  /** Carbon EveBoosterSet2::RegisterComponents (cpp:1272-1279): unconditional
   * LightOwner leaf self-registration. */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /** Carbon EveBoosterSet2::GetLights (cpp:1287-1319): NO display gate
   * (registration is unconditional too) - the effective gates are both light
   * radii <= 0 (cpp:1289) and per-renderable overallIntensity <= 0
   * (cpp:1296). Per renderable: warp blend of radius factor and color
   * (clamped warpIntensity, cpp:1301-1304 - the COLOR blend itself is
   * unclamped 4-component lerp); per single booster: the shared 128-entry
   * random noise table drives a flicker of 1 +/- amplitude around the
   * interpolated noise (cpp:1308-1312), and AddPointLight submits the
   * booster light position under the renderable's parent transform
   * (TransformCoord - single matrix, no composition) with radius *
   * radiusFactor and color * flicker (the 3-arg overload: innerRadius 0,
   * FLAG_DEFAULT - manager-side).
   *
   * Adapted: The g_lightNoise table is module state filled with Math.random (Carbon fills it with rand()/RAND_MAX -
   * random either way).
   */
  @meta.blue.method
  @meta.adapted
  GetLights(lightManager)
  {
    if (this.lightRadius <= 0 && this.lightWarpRadius <= 0)
    {
      return;
    }
    if (!lightManager)
    {
      return;
    }

    const time = Tr2Renderer.GetAnimationTime();
    // Carbon EveBoosterSet2.cpp:1186: radii deliberately UNSCALED here (the
    // child booster set pre-multiplies by its parent scale; this class does
    // not - do not unify).
    const params = {
      lightRadius: this.lightRadius,
      lightColor: this.lightColor,
      lightWarpRadius: this.lightWarpRadius,
      lightWarpColor: this.lightWarpColor,
      lightFlickerAmplitude: this.lightFlickerAmplitude,
      lightFlickerFrequency: this.lightFlickerFrequency
    };

    for (const renderable of this.instances)
    {
      if (renderable.overallIntensity <= 0)
      {
        continue;
      }
      const transform = renderable.GetParentTransform();
      AddBoosterLights(
        lightManager, this._singleBoosters, transform,
        renderable.overallIntensity, this.warpIntensity, params, time);
    }
  }

  /**
   * The flare parameters CreateBoosterFlares consumes, in Carbon's
   * EveBoosterFlareParams shape (EveBoosterSet2.cpp:739-742).
   */
  static _GetFlareParams(owner)
  {
    return {
      warpGlowColor: owner.warpGlowColor,
      glowScale: owner.glowScale,
      glowColor: owner.glowColor,
      haloScaleX: owner.haloScaleX,
      haloScaleY: owner.haloScaleY,
      symHaloScale: owner.symHaloScale,
      haloColor: owner.haloColor,
      warpHaloColor: owner.warpHaloColor
    };
  }

  /**
   * Grows the set bounding sphere just far enough to include one booster
   * position, leaving it unchanged when the position already falls inside.
   */
  static _UpdateBoundingSphere(owner, position)
  {
    const delta = vec3.subtract(vec3.create(), position, owner.boosterBoundingSphereCenter);
    const distance = vec3.length(delta);
    const radius = owner.boosterBoundingSphereRadius;
    if (distance * distance <= radius * radius + 1e-4 || !distance)
    {
      return;
    }
    vec3.scaleAndAdd(
      owner.boosterBoundingSphereCenter,
      owner.boosterBoundingSphereCenter,
      delta,
      0.5 * (1 - radius / distance)
    );
    owner.boosterBoundingSphereRadius = 0.5 * (radius + distance);
  }

  /**
   * Redistributes the five static trail control offsets evenly backwards along
   * -Z across staticTrailLength and clears the staticTrailOffsets flag.
   */
  static _UpdateStaticTrailOffsets(owner)
  {
    const step = owner.staticTrailLength / 4;
    const offsets = [
      owner.trailsStaticOffsets0,
      owner.trailsStaticOffsets1,
      owner.trailsStaticOffsets2,
      owner.trailsStaticOffsets3,
      owner.trailsStaticOffsets4
    ];
    for (let index = 0; index < offsets.length; index++)
    {
      vec3.set(offsets[index], 0, 0, -step * index);
    }
  }

  static _sphereScratch = sph3.create();

  static _zero = [0, 0, 0];

  static _identityRotation = [0, 0, 0, 1];

  static _defaultFunctionality = [0, 1, 1, 1];

  static Shape = Object.freeze({
    STAR: 0,
    BOX: 1,
    SHAPE_COUNT: 2
  });

}

// EveBoosterSet2_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
